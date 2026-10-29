import { setTimeout as sleep } from 'node:timers/promises';
import type {
  CaptureDetail,
  CaptureSummary,
  ScrapeJobSummary,
} from '../features/captures/contracts';
import type { CaptureService } from '../features/captures/service';
import { CliInputError } from './shared';

export function newestJob(
  service: CaptureService,
  capture: CaptureSummary,
): ScrapeJobSummary {
  return service.listJobs(capture.id)[0];
}

export async function captureJobResult(
  service: CaptureService,
  capture: CaptureSummary,
  job: ScrapeJobSummary,
): Promise<{
  capture: CaptureSummary;
  content: CaptureDetail['content'];
  job: ScrapeJobSummary;
}> {
  const finishedJob = await waitForJob(service, capture.id, job.id);
  const detail = service.get(capture.id);

  return {
    capture: detail.capture,
    content: detail.content,
    job: finishedJob,
  };
}

export async function waitForJob(
  service: CaptureService,
  captureId: string,
  jobId: string,
): Promise<ScrapeJobSummary> {
  let job = findJob(service, captureId, jobId);
  while (job.status !== 'succeeded' && job.status !== 'failed') {
    await sleep(250);
    job = findJob(service, captureId, jobId);
  }

  return job;
}

function findJob(
  service: CaptureService,
  captureId: string,
  jobId: string,
): ScrapeJobSummary {
  const job = service.getJob(captureId, jobId);
  if (!job) {
    throw new CliInputError('JOB_NOT_FOUND', 'Scrape job not found');
  }

  return job;
}
