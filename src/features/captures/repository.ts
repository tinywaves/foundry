import { randomUUID } from 'node:crypto';
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { FoundryDatabase } from '../../storage/database';
import { captures, scrapeJobs } from '../../storage/schema';
import type {
  CaptureContent,
  CaptureCounts,
  CaptureDetail,
  CaptureFilter,
  CaptureSummary,
  ScrapeJobSummary,
  StoredJobConfig,
} from './contracts';

type Database = FoundryDatabase['db'];
type CaptureRow = typeof captures.$inferSelect;
type ScrapeJobRow = typeof scrapeJobs.$inferSelect;

export interface JobContext {
  job: ScrapeJobRow;
  capture: CaptureRow;
}

export class CaptureRepository {
  constructor(private readonly db: Database) {}

  private findCapture(captureId: string): CaptureRow | null {
    return this.db
      .select()
      .from(captures)
      .where(and(eq(captures.id, captureId), isNull(captures.deletedAt)))
      .get() ?? null;
  }

  private findJob(jobId: string): ScrapeJobRow | null {
    return this.db
      .select()
      .from(scrapeJobs)
      .where(eq(scrapeJobs.id, jobId))
      .get() ?? null;
  }

  list(filter: CaptureFilter): CaptureSummary[] {
    const condition = filter === 'no-successful'
      ? and(isNull(captures.deletedAt), isNull(captures.latestSuccessfulJobId))
      : isNull(captures.deletedAt);

    return this.db
      .select()
      .from(captures)
      .where(condition)
      .orderBy(desc(captures.createdAt))
      .all()
      .map((row) => toCaptureSummary(row));
  }

  counts(): CaptureCounts {
    const active = isNull(captures.deletedAt);
    const all = this.db
      .select({ value: count() })
      .from(captures)
      .where(active)
      .get()
      ?.value ?? 0;
    const noSuccessful = this.db
      .select({ value: count() })
      .from(captures)
      .where(and(active, isNull(captures.latestSuccessfulJobId)))
      .get()
      ?.value ?? 0;

    return { all, noSuccessful };
  }

  get(captureId: string): CaptureDetail | null {
    const capture = this.findCapture(captureId);
    if (!capture) {
      return null;
    }

    const successfulJob = capture.latestSuccessfulJobId
      ? this.db
          .select()
          .from(scrapeJobs)
          .where(and(
            eq(scrapeJobs.id, capture.latestSuccessfulJobId),
            eq(scrapeJobs.captureId, captureId),
            isNull(scrapeJobs.deletedAt),
          ))
          .get()
      : undefined;

    return {
      capture: toCaptureSummary(capture),
      content: successfulJob ? toCaptureContent(successfulJob) : null,
    };
  }

  findActiveByURL(url: string): CaptureRow | null {
    return this.db
      .select()
      .from(captures)
      .where(and(eq(captures.url, url), isNull(captures.deletedAt)))
      .get() ?? null;
  }

  createWithJob(url: string, userNote: string | null, config: StoredJobConfig): {
    capture: CaptureSummary;
    jobId: string;
  } {
    const timestamp = new Date();
    const captureId = randomUUID();
    const jobId = randomUUID();

    this.db.transaction((tx) => {
      tx.insert(captures).values({
        id: captureId,
        url,
        title: null,
        userNote,
        latestSuccessfulJobId: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      }).run();

      tx.insert(scrapeJobs).values({
        id: jobId,
        captureId,
        fetcher: config.fetcher,
        configSnapshot: JSON.stringify(config),
        rawResponseJson: null,
        status: 'pending',
        errorCode: null,
        errorMessage: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        deletedAt: null,
      }).run();
    });

    const capture = this.findCapture(captureId);
    if (!capture) {
      throw new Error('Capture was not created');
    }

    return {
      capture: toCaptureSummary(capture),
      jobId,
    };
  }

  hasActiveJob(captureId: string): boolean {
    const row = this.db
      .select({ id: scrapeJobs.id })
      .from(scrapeJobs)
      .where(and(
        eq(scrapeJobs.captureId, captureId),
        inArray(scrapeJobs.status, ['pending', 'running']),
        isNull(scrapeJobs.deletedAt),
      ))
      .get();

    return Boolean(row);
  }

  createJob(captureId: string, config: StoredJobConfig): {
    job: ScrapeJobSummary;
    jobId: string;
  } {
    const timestamp = new Date();
    const jobId = randomUUID();

    this.db.insert(scrapeJobs).values({
      id: jobId,
      captureId,
      fetcher: config.fetcher,
      configSnapshot: JSON.stringify(config),
      rawResponseJson: null,
      status: 'pending',
      errorCode: null,
      errorMessage: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    }).run();

    const job = this.findJob(jobId);
    if (!job) {
      throw new Error('Scrape job was not created');
    }

    return {
      job: toJobSummary(job),
      jobId,
    };
  }

  delete(captureId: string): boolean {
    const timestamp = new Date();
    const rows = this.db
      .update(captures)
      .set({ deletedAt: timestamp, updatedAt: timestamp })
      .where(and(eq(captures.id, captureId), isNull(captures.deletedAt)))
      .returning()
      .all();

    if (rows.length === 0) {
      return false;
    }

    this.db
      .update(scrapeJobs)
      .set({ deletedAt: timestamp, updatedAt: timestamp })
      .where(and(eq(scrapeJobs.captureId, captureId), isNull(scrapeJobs.deletedAt)))
      .run();

    return true;
  }

  updateNote(captureId: string, userNote: string): CaptureSummary | null {
    const note = userNote.trim() || null;
    const rows = this.db
      .update(captures)
      .set({ userNote: note, updatedAt: new Date() })
      .where(and(eq(captures.id, captureId), isNull(captures.deletedAt)))
      .returning()
      .all();

    return rows.length === 0 ? null : toCaptureSummary(rows[0]);
  }

  listJobs(captureId: string): ScrapeJobSummary[] {
    return this.db
      .select()
      .from(scrapeJobs)
      .where(and(eq(scrapeJobs.captureId, captureId), isNull(scrapeJobs.deletedAt)))
      .orderBy(desc(scrapeJobs.createdAt))
      .all()
      .map((row) => toJobSummary(row));
  }

  getJobContext(jobId: string): JobContext | null {
    const job = this.findJob(jobId);
    if (!job || job.deletedAt) {
      return null;
    }

    const capture = this.findCapture(job.captureId);
    return capture ? { job, capture } : null;
  }

  markRunning(jobId: string): void {
    this.db
      .update(scrapeJobs)
      .set({ status: 'running', updatedAt: new Date() })
      .where(and(eq(scrapeJobs.id, jobId), eq(scrapeJobs.status, 'pending')))
      .run();
  }

  markSucceeded(
    jobId: string,
    captureId: string,
    title: string | null,
    rawResponse: unknown,
  ): void {
    const timestamp = new Date();

    this.db.transaction((tx) => {
      tx.update(scrapeJobs)
        .set({
          status: 'succeeded',
          rawResponseJson: JSON.stringify(rawResponse),
          errorCode: null,
          errorMessage: null,
          updatedAt: timestamp,
        })
        .where(eq(scrapeJobs.id, jobId))
        .run();

      tx.update(captures)
        .set({
          ...(title && { title }),
          latestSuccessfulJobId: jobId,
          updatedAt: timestamp,
        })
        .where(eq(captures.id, captureId))
        .run();
    });
  }

  markFailed(
    jobId: string,
    errorCode: string,
    errorMessage: string,
  ): void {
    this.db
      .update(scrapeJobs)
      .set({
        status: 'failed',
        errorCode,
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(scrapeJobs.id, jobId))
      .run();
  }

  recoverRunningJobs(): number {
    const rows = this.db
      .select({ id: scrapeJobs.id })
      .from(scrapeJobs)
      .where(and(eq(scrapeJobs.status, 'running'), isNull(scrapeJobs.deletedAt)))
      .all();

    if (rows.length > 0) {
      this.db
        .update(scrapeJobs)
        .set({ status: 'pending' })
        .where(and(eq(scrapeJobs.status, 'running'), isNull(scrapeJobs.deletedAt)))
        .run();
    }

    return rows.length;
  }

  pendingJobIDs(): string[] {
    return this.db
      .select({ id: scrapeJobs.id })
      .from(scrapeJobs)
      .where(and(eq(scrapeJobs.status, 'pending'), isNull(scrapeJobs.deletedAt)))
      .orderBy(scrapeJobs.createdAt)
      .all()
      .map((row) => row.id);
  }
}

function toCaptureSummary(row: CaptureRow): CaptureSummary {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    userNote: row.userNote,
    latestSuccessfulJobId: row.latestSuccessfulJobId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toJobSummary(row: ScrapeJobRow): ScrapeJobSummary {
  return {
    id: row.id,
    captureId: row.captureId,
    status: row.status as ScrapeJobSummary['status'],
    fetcher: row.fetcher as ScrapeJobSummary['fetcher'],
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toCaptureContent(row: ScrapeJobRow): CaptureContent | null {
  if (!row.rawResponseJson) {
    return null;
  }

  try {
    const response: unknown = JSON.parse(row.rawResponseJson);
    if (!isRecord(response)) {
      return null;
    }

    const markdown = typeof response.markdown === 'string'
      ? response.markdown
      : (typeof response.content === 'string'
          ? response.content
          : null);

    if (markdown === null) {
      return null;
    }

    return {
      jobId: row.id,
      markdown: row.fetcher === 'deepseek' ? unescapeDeepSeekMarkdown(markdown) : markdown,
    };
  } catch {
    return null;
  }
}

function unescapeDeepSeekMarkdown(value: string): string {
  return value.replaceAll(/\\(.)/g, (match, character: string) =>
    (/\p{P}/u).test(character) ? character : match);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
