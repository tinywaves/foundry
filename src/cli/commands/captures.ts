import { defineCommand } from 'citty';
import {
  parseCaptureFilter,
  parseCreateCaptureInput,
} from '../../features/captures/contracts';
import { captureJobResult, newestJob } from '../capture-jobs';
import { runCliAction } from '../shared';
import { captureJobsCommand } from './capture-jobs';

const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List captures',
    alias: ['ls'],
  },
  args: {
    filter: {
      type: 'enum',
      description: 'Capture filter',
      options: ['all', 'no-successful'],
      default: 'all',
    },
  },
  run({ args }) {
    return runCliAction(({ runtime }) =>
      runtime.services.captureRuntime.service.list(
        parseCaptureFilter(args.filter),
      ));
  },
});

const counts = defineCommand({
  meta: {
    name: 'counts',
    description: 'Read capture counts',
  },
  run() {
    return runCliAction(({ runtime }) =>
      runtime.services.captureRuntime.service.counts());
  },
});

const get = defineCommand({
  meta: {
    name: 'get',
    description: 'Read a capture and its latest Markdown content',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Capture ID',
      required: true,
    },
  },
  run({ args }) {
    return runCliAction(({ runtime }) =>
      runtime.services.captureRuntime.service.get(args.id));
  },
});

const create = defineCommand({
  meta: {
    name: 'create',
    description: 'Capture a URL',
    alias: ['add'],
  },
  args: {
    url: {
      type: 'positional',
      description: 'HTTP or HTTPS URL',
      required: true,
    },
    note: {
      type: 'string',
      description: 'User note',
      valueHint: 'text',
    },
  },
  run({ args }) {
    return runCliAction(async ({ runtime }) => {
      const service = runtime.services.captureRuntime.service;
      const capture = service.create(parseCreateCaptureInput({
        url: args.url,
        userNote: args.note,
      }));
      const job = newestJob(service, capture);

      return captureJobResult(service, capture, job);
    });
  },
});

const recapture = defineCommand({
  meta: {
    name: 'recapture',
    description: 'Create a new scrape job for an existing capture',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Capture ID',
      required: true,
    },
  },
  run({ args }) {
    return runCliAction(async ({ runtime }) => {
      const service = runtime.services.captureRuntime.service;
      const job = service.recapture(args.id);
      const capture = service.get(args.id).capture;

      return captureJobResult(service, capture, job);
    });
  },
});

const note = defineCommand({
  meta: {
    name: 'note',
    description: 'Replace a capture user note',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Capture ID',
      required: true,
    },
    note: {
      type: 'positional',
      description: 'New note; use an empty string to clear it',
      required: true,
    },
  },
  run({ args }) {
    return runCliAction(({ runtime }) =>
      runtime.services.captureRuntime.service.updateNote(args.id, args.note));
  },
});

const remove = defineCommand({
  meta: {
    name: 'delete',
    description: 'Delete a capture and its scrape jobs',
    alias: ['remove', 'rm'],
  },
  args: {
    id: {
      type: 'positional',
      description: 'Capture ID',
      required: true,
    },
  },
  run({ args }) {
    return runCliAction(({ runtime }) => {
      runtime.services.captureRuntime.service.delete(args.id);
      return { deleted: true, id: args.id };
    });
  },
});

export const capturesCommand = defineCommand({
  meta: {
    name: 'captures',
    description: 'Manage captured pages',
    alias: ['capture'],
  },
  subCommands: {
    list,
    counts,
    get,
    create,
    recapture,
    note,
    delete: remove,
    jobs: captureJobsCommand,
  },
});
