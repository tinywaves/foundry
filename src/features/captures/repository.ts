import { randomUUID } from 'node:crypto';
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { FoundryDatabase } from '../../storage/database';
import { captures, fetchJobs } from '../../storage/schema';
import type {
  CaptureCounts,
  CaptureDetail,
  CaptureFilter,
  CaptureSummary,
  FetchJobSummary,
  StoredJobConfig,
} from './contracts';

type Database = FoundryDatabase['db'];
type CaptureRow = typeof captures.$inferSelect;
type FetchJobRow = typeof fetchJobs.$inferSelect;

export interface JobContext {
  job: FetchJobRow;
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

  private findJob(jobId: string): FetchJobRow | null {
    return this.db
      .select()
      .from(fetchJobs)
      .where(eq(fetchJobs.id, jobId))
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
          .from(fetchJobs)
          .where(and(
            eq(fetchJobs.id, capture.latestSuccessfulJobId),
            eq(fetchJobs.captureId, captureId),
            isNull(fetchJobs.deletedAt),
          ))
          .get()
      : undefined;

    return {
      capture: toCaptureSummary(capture),
      rawResponse: successfulJob ? parseRawResponse(successfulJob.rawResponseJson) : null,
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

      tx.insert(fetchJobs).values({
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
      .select({ id: fetchJobs.id })
      .from(fetchJobs)
      .where(and(
        eq(fetchJobs.captureId, captureId),
        inArray(fetchJobs.status, ['pending', 'running']),
        isNull(fetchJobs.deletedAt),
      ))
      .get();

    return Boolean(row);
  }

  createJob(captureId: string, config: StoredJobConfig): {
    job: FetchJobSummary;
    jobId: string;
  } {
    const timestamp = new Date();
    const jobId = randomUUID();

    this.db.insert(fetchJobs).values({
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
      throw new Error('Fetch job was not created');
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
      .update(fetchJobs)
      .set({ deletedAt: timestamp, updatedAt: timestamp })
      .where(and(eq(fetchJobs.captureId, captureId), isNull(fetchJobs.deletedAt)))
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

  listJobs(captureId: string): FetchJobSummary[] {
    return this.db
      .select()
      .from(fetchJobs)
      .where(and(eq(fetchJobs.captureId, captureId), isNull(fetchJobs.deletedAt)))
      .orderBy(desc(fetchJobs.createdAt))
      .all()
      .map((row) => toJobSummary(row));
  }

  getJob(captureId: string, jobId: string): FetchJobSummary | null {
    const context = this.getJobContext(jobId);
    return context?.capture.id === captureId ? toJobSummary(context.job) : null;
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
      .update(fetchJobs)
      .set({ status: 'running', updatedAt: new Date() })
      .where(and(eq(fetchJobs.id, jobId), eq(fetchJobs.status, 'pending')))
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
      tx.update(fetchJobs)
        .set({
          status: 'succeeded',
          rawResponseJson: JSON.stringify(rawResponse),
          errorCode: null,
          errorMessage: null,
          updatedAt: timestamp,
        })
        .where(eq(fetchJobs.id, jobId))
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
      .update(fetchJobs)
      .set({
        status: 'failed',
        errorCode,
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(fetchJobs.id, jobId))
      .run();
  }

  recoverRunningJobs(): number {
    const rows = this.db
      .select({ id: fetchJobs.id })
      .from(fetchJobs)
      .where(and(eq(fetchJobs.status, 'running'), isNull(fetchJobs.deletedAt)))
      .all();

    if (rows.length > 0) {
      this.db
        .update(fetchJobs)
        .set({ status: 'pending' })
        .where(and(eq(fetchJobs.status, 'running'), isNull(fetchJobs.deletedAt)))
        .run();
    }

    return rows.length;
  }

  pendingJobIDs(): string[] {
    return this.db
      .select({ id: fetchJobs.id })
      .from(fetchJobs)
      .where(and(eq(fetchJobs.status, 'pending'), isNull(fetchJobs.deletedAt)))
      .orderBy(fetchJobs.createdAt)
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

function toJobSummary(row: FetchJobRow): FetchJobSummary {
  return {
    id: row.id,
    captureId: row.captureId,
    status: row.status as FetchJobSummary['status'],
    fetcher: row.fetcher as FetchJobSummary['fetcher'],
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parseRawResponse(value: string | null): unknown {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
