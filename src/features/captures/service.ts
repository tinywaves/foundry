import { readStoredSettings } from '../settings/repository';
import type {
  CaptureCounts,
  CaptureDetail,
  CaptureFilter,
  CaptureSummary,
  CreateCaptureInput,
  ScrapeJobSummary,
  StoredJobConfig,
} from './contracts';
import { CaptureError } from './errors';
import type { CaptureRepository } from './repository';
import type { ScrapeJobRunner } from './runner';

export class CaptureService {
  constructor(
    private readonly repository: CaptureRepository,
    private readonly settingsPath: string,
    private readonly runner: ScrapeJobRunner,
  ) {}

  private executionConfig(): StoredJobConfig | null {
    const settings = readStoredSettings(this.settingsPath).features.library.captures;
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

  list(filter: CaptureFilter): CaptureSummary[] {
    return this.repository.list(filter);
  }

  counts(): CaptureCounts {
    return this.repository.counts();
  }

  get(captureId: string): CaptureDetail {
    const capture = this.repository.get(captureId);
    if (!capture) {
      throw new CaptureError('CAPTURE_NOT_FOUND', 'Capture not found');
    }

    return capture;
  }

  create(input: CreateCaptureInput): CaptureSummary {
    const url = normalizeURL(input.url);
    if (!url) {
      throw new CaptureError('INVALID_URL', 'Enter a valid HTTP or HTTPS URL');
    }
    if (this.repository.findActiveByURL(url)) {
      throw new CaptureError('CAPTURE_ALREADY_EXISTS', 'This link is already captured');
    }

    const config = this.executionConfig();
    if (!config) {
      throw new CaptureError(
        'FETCHER_NOT_CONFIGURED',
        'Configure a capture service before adding a capture',
      );
    }

    try {
      const created = this.repository.createWithJob(
        url,
        input.userNote?.trim() || null,
        config,
      );
      this.runner.enqueue(created.jobId);
      return created.capture;
    } catch (error) {
      if (this.repository.findActiveByURL(url)) {
        throw new CaptureError('CAPTURE_ALREADY_EXISTS', 'This link is already captured');
      }
      throw error;
    }
  }

  recapture(captureId: string): ScrapeJobSummary {
    this.get(captureId);
    if (this.repository.hasActiveJob(captureId)) {
      throw new CaptureError(
        'ACTIVE_JOB_EXISTS',
        'This capture already has an active scrape job',
      );
    }

    const config = this.executionConfig();
    if (!config) {
      throw new CaptureError(
        'FETCHER_NOT_CONFIGURED',
        'Configure a capture service before re-capturing',
      );
    }

    const created = this.repository.createJob(captureId, config);
    this.runner.enqueue(created.jobId);
    return created.job;
  }

  delete(captureId: string): void {
    this.get(captureId);
    if (this.repository.hasActiveJob(captureId)) {
      throw new CaptureError(
        'ACTIVE_JOB_EXISTS',
        'This capture already has an active scrape job',
      );
    }
    if (!this.repository.delete(captureId)) {
      throw new CaptureError('CAPTURE_NOT_FOUND', 'Capture not found');
    }
  }

  updateNote(captureId: string, userNote: string): CaptureSummary {
    const capture = this.repository.updateNote(captureId, userNote);
    if (!capture) {
      throw new CaptureError('CAPTURE_NOT_FOUND', 'Capture not found');
    }

    return capture;
  }

  listJobs(captureId: string): ScrapeJobSummary[] {
    this.get(captureId);
    return this.repository.listJobs(captureId);
  }
}

function normalizeURL(value: string): string | null {
  const url = value.trim();
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}
