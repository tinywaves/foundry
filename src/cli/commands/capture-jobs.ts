import { defineCommand } from 'citty';
import { waitForJob } from '../capture-jobs';
import { CliInputError, runCliAction } from '../shared';

const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List scrape jobs for a capture',
    alias: ['ls'],
  },
  args: {
    'capture-id': {
      type: 'positional',
      description: 'Capture ID',
      required: true,
    },
  },
  run({ args }) {
    return runCliAction(({ runtime }) =>
      runtime.services.captureRuntime.service.listJobs(args['capture-id']));
  },
});

const get = defineCommand({
  meta: {
    name: 'get',
    description: 'Read one scrape job owned by a capture',
    alias: ['show'],
  },
  args: {
    'capture-id': {
      type: 'positional',
      description: 'Capture ID',
      required: true,
    },
    'job-id': {
      type: 'positional',
      description: 'Scrape job ID',
      required: true,
    },
  },
  run({ args }) {
    return runCliAction(({ runtime }) => {
      const job = runtime.services.captureRuntime.service.getJob(
        args['capture-id'],
        args['job-id'],
      );
      if (!job) {
        throw new CliInputError('JOB_NOT_FOUND', 'Scrape job not found');
      }

      return job;
    });
  },
});

const recapture = defineCommand({
  meta: {
    name: 'recapture',
    description: 'Run a new scrape job for a capture and wait for completion',
  },
  args: {
    'capture-id': {
      type: 'positional',
      description: 'Capture ID',
      required: true,
    },
  },
  run({ args }) {
    return runCliAction(async ({ runtime }) => {
      const service = runtime.services.captureRuntime.service;
      const job = service.recapture(args['capture-id']);
      return waitForJob(service, args['capture-id'], job.id);
    });
  },
});

export const captureJobsCommand = defineCommand({
  meta: {
    name: 'jobs',
    description: 'Inspect and run jobs for a capture',
  },
  subCommands: {
    list,
    get,
    recapture,
  },
});
