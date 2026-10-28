import { readStoredSettings } from '../settings/repository';
import { scrapePage } from './fetchers';
import { normalizeFetcherError } from './fetchers/error';
import type { StoredJobConfig } from './contracts';
import type { CaptureRepository } from './repository';

const RETRY_BASE_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 30_000;

export interface ScrapeJobFinishedEvent {
  captureId: string;
  jobId: string;
  status: 'succeeded' | 'failed';
  errorMessage?: string;
}

export class ScrapeJobRunner {
  private readonly queue: string[] = [];
  private readonly knownJobIDs = new Set<string>();
  private runningCount = 0;
  private paused = false;

  constructor(
    private readonly repository: CaptureRepository,
    private readonly settingsPath: string,
    private readonly onFinished: (event: ScrapeJobFinishedEvent) => void = () => {},
  ) {}

  private schedule(): void {
    if (this.paused) {
      return;
    }

    const concurrency = readStoredSettings(
      this.settingsPath,
    ).features.library.captures.scrapeConcurrency;

    while (this.runningCount < concurrency && this.queue.length > 0) {
      const jobId = this.queue.shift();
      if (!jobId) {
        return;
      }

      this.runningCount += 1;
      void this.runJob(jobId).finally(() => {
        this.runningCount -= 1;
        this.knownJobIDs.delete(jobId);
        this.schedule();
      });
    }
  }

  private async runJob(jobId: string): Promise<void> {
    const context = this.repository.getJobContext(jobId);
    if (!context || (context.job.status !== 'pending' && context.job.status !== 'running')) {
      return;
    }

    let config: StoredJobConfig;
    try {
      config = parseStoredConfig(context.job.configSnapshot);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid scrape job configuration';
      this.failJob(jobId, context.job.captureId, 'invalid_config', message);
      return;
    }

    this.repository.markRunning(jobId);

    for (let attempt = 1; attempt <= config.maxAttempts; attempt += 1) {
      try {
        const result = await scrapePage(context.capture.url, config);
        this.repository.markSucceeded(
          jobId,
          context.capture.id,
          result.title,
          result.rawResponse,
        );
        this.onFinished({
          captureId: context.capture.id,
          jobId,
          status: 'succeeded',
        });
        return;
      } catch (error) {
        const fetchError = normalizeFetcherError(error);
        const isLastAttempt = attempt >= config.maxAttempts;
        if (isLastAttempt || !fetchError.isRetryable) {
          this.failJob(
            jobId,
            context.capture.id,
            fetchError.code,
            fetchError.message,
          );
          return;
        }

        await wait(retryDelay(attempt));
      }
    }
  }

  private failJob(
    jobId: string,
    captureId: string,
    code: string,
    message: string,
  ): void {
    this.repository.markFailed(jobId, code, message);
    this.onFinished({
      captureId,
      jobId,
      status: 'failed',
      errorMessage: message,
    });
  }

  start(): void {
    this.repository.recoverRunningJobs();
    for (const jobId of this.repository.pendingJobIDs()) {
      this.enqueue(jobId);
    }
  }

  enqueue(jobId: string): void {
    if (this.knownJobIDs.has(jobId)) {
      return;
    }

    this.knownJobIDs.add(jobId);
    this.queue.push(jobId);
    this.schedule();
  }

  notifySettingsChanged(): void {
    this.schedule();
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.schedule();
  }
}

function parseStoredConfig(value: string): StoredJobConfig {
  const parsed: unknown = JSON.parse(value);
  if (
    !isRecord(parsed)
    || (parsed.fetcher !== 'firecrawl' && parsed.fetcher !== 'deepseek')
    || typeof parsed.apiKey !== 'string'
    || !parsed.apiKey
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
  return Math.min(RETRY_MAX_DELAY_MS, exponential) + Math.floor(Math.random() * 250);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
