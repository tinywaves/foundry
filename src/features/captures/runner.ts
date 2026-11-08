import { readStoredSettings } from '../settings/repository';
import type { CaptureJobChangedEvent } from './events';
import { fetchCapture } from './fetchers';
import type { CaptureFetcher } from './fetchers';
import { normalizeFetcherError } from './fetchers/error';
import type { StoredJobConfig } from './contracts';
import type { CaptureRepository } from './repository';

export class FetchJobRunner {
  private readonly queue: string[] = [];
  private readonly knownJobIDs = new Set<string>();
  private runningCount = 0;
  private paused = false;

  constructor(
    private readonly repository: CaptureRepository,
    private readonly settingsPath: string,
    private readonly onChanged: (event: CaptureJobChangedEvent) => void = () => {},
    private readonly fetchCaptureImplementation: CaptureFetcher = fetchCapture,
  ) {}

  private schedule(): void {
    if (this.paused) {
      return;
    }

    const concurrency = readStoredSettings(
      this.settingsPath,
    ).features.library.captures.fetchConcurrency;

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
      const message = error instanceof Error ? error.message : 'Invalid fetch job configuration';
      this.failJob(jobId, context.job.captureId, 'invalid_config', message);
      return;
    }

    this.repository.markRunning(jobId);
    this.onChanged({
      captureId: context.capture.id,
      jobId,
      status: 'running',
    });

    try {
      const result = await this.fetchCaptureImplementation(
        context.capture.url,
        config,
      );
      this.repository.markSucceeded(
        jobId,
        context.capture.id,
        result.title,
        result.rawResponse,
        result.creditsUsed,
      );
      this.onChanged({
        captureId: context.capture.id,
        jobId,
        status: 'succeeded',
      });
    } catch (error) {
      const fetchError = normalizeFetcherError(error);
      this.failJob(
        jobId,
        context.capture.id,
        fetchError.code,
        fetchError.message,
      );
    }
  }

  private failJob(
    jobId: string,
    captureId: string,
    code: string,
    message: string,
  ): void {
    this.repository.markFailed(jobId, code, message);
    this.onChanged({
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

    const context = this.repository.getJobContext(jobId);
    if (!context) {
      return;
    }

    this.knownJobIDs.add(jobId);
    this.queue.push(jobId);
    this.onChanged({
      captureId: context.capture.id,
      jobId,
      status: 'pending',
    });
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
    || parsed.fetcher !== 'firecrawl'
    || typeof parsed.apiKey !== 'string'
    || !parsed.apiKey
    || typeof parsed.maxAttempts !== 'number'
  ) {
    throw new Error('Invalid fetch job configuration');
  }

  return {
    fetcher: parsed.fetcher,
    apiKey: parsed.apiKey,
    maxAttempts: Math.min(10, Math.max(1, Math.trunc(parsed.maxAttempts))),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
