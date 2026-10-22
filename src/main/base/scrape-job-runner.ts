import { and, asc, eq, isNull } from 'drizzle-orm';
import { readSettings } from '../settings';
import type { FoundryDatabase } from '../database';
import { captures, scrapeJobs } from '../database/schema';
import type { FetcherType } from '../../shared/settings';
import type { ScrapeJobFinishedEvent } from '../../shared/base';
import { scrapePage } from './fetcher';
import { normalizeFetcherError } from './fetcher-error';
import { log } from '../logger';

const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 30_000;

type Database = FoundryDatabase['db'];

type StoredJobConfig = {
  fetcher: FetcherType;
  apiKey: string;
  maxAttempts: number;
};

function parseStoredConfig(value: string): StoredJobConfig {
  const parsed: unknown = JSON.parse(value);
  if (
    typeof parsed !== 'object'
    || parsed === null
    || !('fetcher' in parsed)
    || (parsed.fetcher !== 'firecrawl' && parsed.fetcher !== 'deepseek')
    || !('apiKey' in parsed)
    || typeof parsed.apiKey !== 'string'
    || !parsed.apiKey
    || !('maxAttempts' in parsed)
    || typeof parsed.maxAttempts !== 'number'
  ) {
    throw new Error('Invalid scrape job configuration');
  }

  return {
    fetcher: parsed.fetcher,
    apiKey: parsed.apiKey,
    maxAttempts: Math.min(10, Math.max(1, Math.trunc(parsed.maxAttempts))),
  };
}

function retryDelay(attempt: number): number {
  const exponential = RETRY_BASE_DELAY_MS * (2 ** (attempt - 1));
  const jitter = Math.floor(Math.random() * 250);
  return Math.min(RETRY_MAX_DELAY_MS, exponential) + jitter;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export class ScrapeJobRunner {
  private readonly queue: string[] = [];
  private readonly knownJobIds = new Set<string>();
  private runningCount = 0;

  constructor(
    private readonly db: Database,
    private readonly settingsPath: string,
    private readonly onFinished: (event: ScrapeJobFinishedEvent) => void,
  ) {}

  private schedule(): void {
    const concurrency = readSettings(this.settingsPath).features.base.scrapeConcurrency;
    while (this.runningCount < concurrency && this.queue.length > 0) {
      const jobId = this.queue.shift();
      if (!jobId) {
        return;
      }
      this.runningCount += 1;
      void this.runJob(jobId).finally(() => {
        this.runningCount -= 1;
        this.knownJobIds.delete(jobId);
        this.schedule();
      });
    }
  }

  private async runJob(jobId: string): Promise<void> {
    const job = this.db.select()
      .from(scrapeJobs)
      .where(and(eq(scrapeJobs.id, jobId), isNull(scrapeJobs.deletedAt)))
      .get();

    if (!job || (job.status !== 'pending' && job.status !== 'running')) {
      return;
    }

    const capture = this.db.select()
      .from(captures)
      .where(and(eq(captures.id, job.captureId), isNull(captures.deletedAt)))
      .get();

    if (!capture) {
      this.finishFailure(job.id, job.captureId, 'capture_not_found', 'Capture not found');
      return;
    }

    let config: StoredJobConfig;
    try {
      config = parseStoredConfig(job.configSnapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid scrape job configuration';
      this.finishFailure(job.id, job.captureId, 'invalid_config', message);
      return;
    }

    this.db.update(scrapeJobs)
      .set({ status: 'running' })
      .where(and(eq(scrapeJobs.id, job.id), eq(scrapeJobs.status, 'pending')))
      .run();

    log.info('scrape_job_started', {
      jobId: job.id,
      captureId: job.captureId,
      fetcher: config.fetcher,
      maxAttempts: config.maxAttempts,
      url: capture.url,
    });

    for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
      const startedAt = Date.now();
      try {
        const result = await scrapePage(capture.url, config);
        const rawResponseJson = JSON.stringify(result.rawResponse);
        const finishedAt = new Date();

        this.db.transaction((tx) => {
          tx.update(scrapeJobs)
            .set({
              status: 'succeeded',
              rawResponseJson,
              errorCode: null,
              errorMessage: null,
              updatedAt: finishedAt,
            })
            .where(eq(scrapeJobs.id, job.id))
            .run();

          tx.update(captures)
            .set({
              ...(result.title && { title: result.title }),
              latestSuccessfulJobId: job.id,
              updatedAt: finishedAt,
            })
            .where(eq(captures.id, job.captureId))
            .run();
        });

        log.info('scrape_job_succeeded', {
          jobId: job.id,
          captureId: job.captureId,
          attempt,
          durationMs: Date.now() - startedAt,
        });
        this.onFinished({
          captureId: job.captureId,
          jobId: job.id,
          status: 'succeeded',
        });
        return;
      } catch (error) {
        const fetchError = normalizeFetcherError(error);
        log.warn('scrape_attempt_failed', {
          jobId: job.id,
          captureId: job.captureId,
          attempt,
          maxAttempts: config.maxAttempts,
          durationMs: Date.now() - startedAt,
          code: fetchError.code,
          statusCode: fetchError.statusCode,
          retryable: fetchError.isRetryable,
          error: fetchError.message,
        });

        const isLastAttempt = attempt >= config.maxAttempts;
        if (isLastAttempt || !fetchError.isRetryable) {
          this.finishFailure(
            job.id,
            job.captureId,
            fetchError.code,
            fetchError.message,
          );
          return;
        }

        await wait(retryDelay(attempt));
      }
    }
  }

  private finishFailure(
    jobId: string,
    captureId: string,
    errorCode: string,
    errorMessage: string,
  ): void {
    this.db.update(scrapeJobs)
      .set({
        status: 'failed',
        errorCode,
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(scrapeJobs.id, jobId))
      .run();

    log.error('scrape_job_failed', {
      jobId,
      captureId,
      code: errorCode,
      error: errorMessage,
    });
    this.onFinished({
      captureId,
      jobId,
      status: 'failed',
      errorMessage,
    });
  }

  start(): void {
    const runningJobs = this.db.select()
      .from(scrapeJobs)
      .where(and(eq(scrapeJobs.status, 'running'), isNull(scrapeJobs.deletedAt)))
      .all();

    if (runningJobs.length > 0) {
      this.db.update(scrapeJobs)
        .set({ status: 'pending' })
        .where(and(eq(scrapeJobs.status, 'running'), isNull(scrapeJobs.deletedAt)))
        .run();
      log.warn('scrape_jobs_recovered', { count: runningJobs.length });
    }

    const pendingJobs = this.db.select({ id: scrapeJobs.id })
      .from(scrapeJobs)
      .where(and(eq(scrapeJobs.status, 'pending'), isNull(scrapeJobs.deletedAt)))
      .orderBy(asc(scrapeJobs.createdAt))
      .all();

    for (const job of pendingJobs) {
      this.enqueue(job.id);
    }
  }

  enqueue(jobId: string): void {
    if (this.knownJobIds.has(jobId)) {
      return;
    }
    this.knownJobIds.add(jobId);
    this.queue.push(jobId);
    this.schedule();
  }

  notifySettingsChanged(): void {
    this.schedule();
  }
}
