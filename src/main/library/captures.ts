import { randomUUID } from 'node:crypto';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { FoundryDatabase } from '../database';
import { captures, scrapeJobs } from '../database/schema';
import type {
  CaptureContent,
  CaptureDetail,
  CaptureFilter,
  CaptureResult,
  CaptureSummary,
  CreateCaptureInput,
  CreateCaptureResult,
  ScrapeJobStatus,
  ScrapeJobSummary,
} from '../../shared/captures';
import type { CaptureSettings, FetcherType } from '../../shared/settings';
import { readSettings } from '../settings';
import type { ScrapeJobRunner } from './scrape-job-runner';

type Database = FoundryDatabase['db'];
type CaptureRow = typeof captures.$inferSelect;
type ScrapeJobRow = typeof scrapeJobs.$inferSelect;

type StoredJobConfig = {
  fetcher: FetcherType;
  apiKey: string;
  maxAttempts: number;
};

function failure<T>(
  code:
    | 'ACTIVE_JOB_EXISTS'
    | 'FETCHER_NOT_CONFIGURED'
    | 'CAPTURE_ALREADY_EXISTS'
    | 'CAPTURE_NOT_FOUND'
    | 'INVALID_URL',
  message: string,
): CaptureResult<T> {
  return { ok: false, error: { code, message } };
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
    status: row.status as ScrapeJobStatus,
    fetcher: row.fetcher as FetcherType,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toCaptureContent(row: ScrapeJobRow | undefined): CaptureContent | null {
  if (!row?.rawResponseJson) {
    return null;
  }

  try {
    const response: unknown = JSON.parse(row.rawResponseJson);
    if (typeof response !== 'object' || response === null) {
      return null;
    }

    const rawMarkdown = 'markdown' in response && typeof response.markdown === 'string'
      ? response.markdown
      : ('content' in response && typeof response.content === 'string'
          ? response.content
          : null);

    if (rawMarkdown === null) {
      return null;
    }

    return {
      jobId: row.id,
      // DeepSeek escapes Markdown punctuation in its extracted content.
      markdown: row.fetcher === 'deepseek'
        ? unescapeDeepSeekMarkdown(rawMarkdown)
        : rawMarkdown,
    };
  } catch {
    return null;
  }
}

function unescapeDeepSeekMarkdown(value: string): string {
  return value.replaceAll(/\\(.)/g, (match, character: string) => (
    (/\p{P}/u).test(character) ? character : match
  ));
}

function normalizeUrl(value: string): string | null {
  const url = value.trim();
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function executionConfig(settings: CaptureSettings): StoredJobConfig | null {
  if (!settings.fetcher) {
    return null;
  }
  const apiKey = settings[settings.fetcher].apiKey.trim();
  if (!apiKey) {
    return null;
  }
  return {
    fetcher: settings.fetcher,
    apiKey,
    maxAttempts: settings.maxAttempts,
  };
}

export class CaptureService {
  constructor(
    private readonly db: Database,
    private readonly settingsPath: string,
    private readonly runner: ScrapeJobRunner,
  ) {}

  list(filter: CaptureFilter = 'all'): CaptureSummary[] {
    const condition = filter === 'no-successful'
      ? and(isNull(captures.deletedAt), isNull(captures.latestSuccessfulJobId))
      : isNull(captures.deletedAt);

    return this.db.select()
      .from(captures)
      .where(condition)
      .orderBy(desc(captures.createdAt))
      .all()
      .map((row) => toCaptureSummary(row));
  }

  get(captureId: string): CaptureResult<CaptureDetail> {
    const capture = this.db.select()
      .from(captures)
      .where(and(eq(captures.id, captureId), isNull(captures.deletedAt)))
      .get();
    if (!capture) {
      return failure('CAPTURE_NOT_FOUND', 'Capture not found');
    }

    const successfulJob = capture.latestSuccessfulJobId
      ? this.db.select()
          .from(scrapeJobs)
          .where(and(
            eq(scrapeJobs.id, capture.latestSuccessfulJobId),
            eq(scrapeJobs.captureId, captureId),
            isNull(scrapeJobs.deletedAt),
          ))
          .get()
      : undefined;

    return {
      ok: true,
      data: {
        capture: toCaptureSummary(capture),
        content: toCaptureContent(successfulJob),
      },
    };
  }

  create(input: CreateCaptureInput): CaptureResult<CreateCaptureResult> {
    const url = normalizeUrl(input.url);
    if (!url) {
      return failure('INVALID_URL', 'Enter a valid HTTP or HTTPS URL');
    }

    const existing = this.db.select()
      .from(captures)
      .where(and(eq(captures.url, url), isNull(captures.deletedAt)))
      .get();

    if (existing) {
      return failure('CAPTURE_ALREADY_EXISTS', 'This link is already captured');
    }

    const config = executionConfig(readSettings(this.settingsPath).features.library.captures);
    if (!config) {
      return failure('FETCHER_NOT_CONFIGURED', 'Configure a Fetcher before adding a capture');
    }

    const timestamp = new Date();
    const captureId = randomUUID();
    const jobId = randomUUID();
    const userNote = input.userNote?.trim() || null;

    try {
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
    } catch (error) {
      const duplicate = this.db.select()
        .from(captures)
        .where(and(eq(captures.url, url), isNull(captures.deletedAt)))
        .get();
      if (duplicate) {
        return failure('CAPTURE_ALREADY_EXISTS', 'This link is already captured');
      }
      throw error;
    }

    const row = this.db.select().from(captures).where(eq(captures.id, captureId)).get();
    if (!row) {
      throw new Error('Capture was not created');
    }
    this.runner.enqueue(jobId);
    return { ok: true, data: { capture: toCaptureSummary(row) } };
  }

  recapture(captureId: string): CaptureResult<ScrapeJobSummary> {
    const capture = this.db.select()
      .from(captures)
      .where(and(eq(captures.id, captureId), isNull(captures.deletedAt)))
      .get();
    if (!capture) {
      return failure('CAPTURE_NOT_FOUND', 'Capture not found');
    }

    const config = executionConfig(readSettings(this.settingsPath).features.library.captures);
    if (!config) {
      return failure('FETCHER_NOT_CONFIGURED', 'Configure a Fetcher before re-capturing');
    }

    const timestamp = new Date();
    const jobId = randomUUID();
    const outcome = this.db.transaction((tx) => {
      const activeJob = tx.select({ id: scrapeJobs.id })
        .from(scrapeJobs)
        .where(and(
          eq(scrapeJobs.captureId, captureId),
          inArray(scrapeJobs.status, ['pending', 'running']),
          isNull(scrapeJobs.deletedAt),
        ))
        .get();
      if (activeJob) {
        return { kind: 'active' as const };
      }

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
      return { kind: 'created' as const };
    });

    if (outcome.kind === 'active') {
      return failure('ACTIVE_JOB_EXISTS', 'This capture already has an active scrape job');
    }

    const row = this.db.select().from(scrapeJobs).where(eq(scrapeJobs.id, jobId)).get();
    if (!row) {
      throw new Error('Scrape job was not created');
    }
    this.runner.enqueue(jobId);
    return { ok: true, data: toJobSummary(row) };
  }

  delete(captureId: string): CaptureResult<null> {
    const timestamp = new Date();
    const outcome = this.db.transaction((tx) => {
      const capture = tx.select({ id: captures.id })
        .from(captures)
        .where(and(eq(captures.id, captureId), isNull(captures.deletedAt)))
        .get();
      if (!capture) {
        return { kind: 'missing' as const };
      }

      const activeJob = tx.select({ id: scrapeJobs.id })
        .from(scrapeJobs)
        .where(and(
          eq(scrapeJobs.captureId, captureId),
          inArray(scrapeJobs.status, ['pending', 'running']),
          isNull(scrapeJobs.deletedAt),
        ))
        .get();
      if (activeJob) {
        return { kind: 'active' as const };
      }

      tx.update(captures)
        .set({ deletedAt: timestamp, updatedAt: timestamp })
        .where(eq(captures.id, captureId))
        .run();
      tx.update(scrapeJobs)
        .set({ deletedAt: timestamp, updatedAt: timestamp })
        .where(and(eq(scrapeJobs.captureId, captureId), isNull(scrapeJobs.deletedAt)))
        .run();
      return { kind: 'deleted' as const };
    });

    if (outcome.kind === 'missing') {
      return failure('CAPTURE_NOT_FOUND', 'Capture not found');
    }
    return outcome.kind === 'active' ? failure('ACTIVE_JOB_EXISTS', 'This capture already has an active scrape job') : { ok: true, data: null };
  }

  updateNote(captureId: string, userNote: string): CaptureResult<CaptureSummary> {
    const note = userNote.trim() || null;
    const rows = this.db.update(captures)
      .set({ userNote: note, updatedAt: new Date() })
      .where(and(eq(captures.id, captureId), isNull(captures.deletedAt)))
      .returning()
      .all();
    return rows.length === 0
      ? failure('CAPTURE_NOT_FOUND', 'Capture not found')
      : { ok: true, data: toCaptureSummary(rows[0]) };
  }

  listJobs(captureId: string): CaptureResult<ScrapeJobSummary[]> {
    const capture = this.db.select({ id: captures.id })
      .from(captures)
      .where(and(eq(captures.id, captureId), isNull(captures.deletedAt)))
      .get();
    if (!capture) {
      return failure('CAPTURE_NOT_FOUND', 'Capture not found');
    }

    return {
      ok: true,
      data: this.db.select()
        .from(scrapeJobs)
        .where(and(eq(scrapeJobs.captureId, captureId), isNull(scrapeJobs.deletedAt)))
        .orderBy(desc(scrapeJobs.createdAt))
        .all()
        .map((row) => toJobSummary(row)),
    };
  }
}
