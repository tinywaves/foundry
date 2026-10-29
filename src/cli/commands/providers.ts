import { defineCommand } from 'citty';
import {
  parseProviderConnection,
  parseProviderInput,
  parseProviderStatus,
  PROVIDER_STATUSES,
} from '../../features/providers/contracts';
import { ProviderNotFoundError } from '../../features/providers/repository';
import {
  JSON_INPUT_ARGS,
  readJsonInput,
  runCliAction,
} from '../shared';

const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List providers and model credentials',
    alias: ['ls'],
  },
  run() {
    return runCliAction(({ runtime }) => runtime.services.providerService.list());
  },
});

const get = defineCommand({
  meta: {
    name: 'get',
    description: 'Read one provider',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Provider ID',
      required: true,
    },
  },
  run({ args }) {
    return runCliAction(({ runtime }) => {
      const provider = runtime.services.providerService.get(args.id);
      if (!provider) {
        throw new ProviderNotFoundError();
      }

      return provider;
    });
  },
});

const create = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a provider from a JSON payload',
    alias: ['add'],
  },
  args: JSON_INPUT_ARGS,
  run({ args }) {
    return runCliAction(async ({ runtime }) => {
      const input = parseProviderInput(await readJsonInput(args));
      return runtime.services.providerService.save(input);
    });
  },
});

const update = defineCommand({
  meta: {
    name: 'update',
    description: 'Replace a provider using a JSON payload',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Provider ID',
      required: true,
    },
    ...JSON_INPUT_ARGS,
  },
  run({ args }) {
    return runCliAction(async ({ runtime }) => {
      const input = parseProviderInput(await readJsonInput(args));
      return runtime.services.providerService.save(input, args.id);
    });
  },
});

const statusCommand = defineCommand({
  meta: {
    name: 'set-status',
    description: 'Change a provider status',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Provider ID',
      required: true,
    },
    status: {
      type: 'enum',
      description: 'New provider status',
      options: [...PROVIDER_STATUSES],
      required: true,
    },
  },
  run({ args }) {
    return runCliAction(({ runtime }) =>
      runtime.services.providerService.setStatus(
        args.id,
        parseProviderStatus(args.status),
      ));
  },
});

const models = defineCommand({
  meta: {
    name: 'models',
    description: 'Discover models for a saved provider',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Provider ID',
      required: true,
    },
  },
  run({ args }) {
    return runCliAction(({ runtime }) =>
      runtime.services.providerService.fetchModels(args.id));
  },
});

const modelsForConnection = defineCommand({
  meta: {
    name: 'models-for-connection',
    description: 'Discover models before saving a provider',
  },
  args: JSON_INPUT_ARGS,
  run({ args }) {
    return runCliAction(async ({ runtime }) => {
      const connection = parseProviderConnection(await readJsonInput(args));
      return runtime.services.providerService.fetchModelsForConnection(connection);
    });
  },
});

export const providersCommand = defineCommand({
  meta: {
    name: 'providers',
    description: 'Manage model providers',
    alias: ['provider'],
  },
  subCommands: {
    list,
    get,
    create,
    update,
    'set-status': statusCommand,
    models,
    'models-for-connection': modelsForConnection,
  },
});
