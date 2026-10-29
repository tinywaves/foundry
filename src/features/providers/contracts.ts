export const PROVIDER_PROTOCOLS = [
  'openai-responses',
  'anthropic-messages',
  'openai-compatible-chat-completions',
] as const;

export const PROVIDER_STATUSES = ['active', 'disabled', 'deleted'] as const;

export type ProviderProtocol = (typeof PROVIDER_PROTOCOLS)[number];
export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];

export interface CustomModel {
  id: string;
  displayName: string | null;
}

export interface ProviderInput {
  name: string;
  protocol: ProviderProtocol;
  baseURL: string;
  apiKey: string;
  shouldClearApiKey?: boolean;
  customModels: CustomModel[];
}

export interface ProviderSummary {
  id: string;
  name: string;
  protocol: ProviderProtocol;
  baseURL: string;
  apiKey: string;
  customModels: CustomModel[];
  status: ProviderStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ProviderListItem extends ProviderSummary {
  isInUse: boolean;
}

export interface ProviderConnection {
  protocol: ProviderProtocol;
  baseURL: string;
  apiKey: string;
}

export interface RemoteModel {
  id: string;
  displayName?: string;
}

export class ProviderInputError extends Error {
  readonly code = 'INVALID_PROVIDER_INPUT';

  constructor(message: string) {
    super(message);
    this.name = 'ProviderInputError';
  }
}

export class ProviderInUseError extends Error {
  readonly code = 'PROVIDER_IN_USE';

  constructor() {
    super('Provider is currently in use');
    this.name = 'ProviderInUseError';
  }
}

export function parseProviderInput(value: unknown): ProviderInput {
  if (!isRecord(value)) {
    throw new ProviderInputError('Provider input must be an object');
  }

  const name = parseRequiredString(value.name, 'name');
  const protocol = parseProtocol(value.protocol);
  const baseURL = parseBaseURL(value.baseURL);
  const apiKey = value.apiKey === undefined
    ? ''
    : parseRequiredString(value.apiKey, 'apiKey', { allowEmpty: true });
  const shouldClearApiKey = value.shouldClearApiKey ?? false;
  if (typeof shouldClearApiKey !== 'boolean') {
    throw new ProviderInputError('shouldClearApiKey must be a boolean');
  }
  if (shouldClearApiKey && apiKey.length > 0) {
    throw new ProviderInputError('apiKey and shouldClearApiKey cannot be combined');
  }
  const customModels = parseCustomModels(value.customModels);

  return {
    name,
    protocol,
    baseURL,
    apiKey,
    shouldClearApiKey,
    customModels,
  };
}

export function parseProviderConnection(value: unknown): ProviderConnection {
  if (!isRecord(value)) {
    throw new ProviderInputError('Provider connection must be an object');
  }

  return {
    protocol: parseProtocol(value.protocol),
    baseURL: parseBaseURL(value.baseURL),
    apiKey: value.apiKey === undefined
      ? ''
      : parseRequiredString(value.apiKey, 'apiKey', { allowEmpty: true }),
  };
}

export function parseProviderStatus(value: unknown): ProviderStatus {
  if (typeof value !== 'string' || !PROVIDER_STATUSES.includes(value as ProviderStatus)) {
    throw new ProviderInputError('Invalid provider status');
  }

  return value as ProviderStatus;
}

export function parseCustomModels(value: unknown): CustomModel[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new ProviderInputError('customModels must be an array');
  }

  return value.map((model) => {
    if (!isRecord(model)) {
      throw new ProviderInputError('Each custom model must be an object');
    }

    return {
      id: parseRequiredString(model.id, 'customModels.id'),
      displayName: model.displayName === null || model.displayName === undefined
        ? null
        : parseRequiredString(model.displayName, 'customModels.displayName'),
    };
  });
}

function parseProtocol(value: unknown): ProviderProtocol {
  if (typeof value !== 'string' || !PROVIDER_PROTOCOLS.includes(value as ProviderProtocol)) {
    throw new ProviderInputError('Invalid provider protocol');
  }

  return value as ProviderProtocol;
}

function parseBaseURL(value: unknown): string {
  const baseURL = parseRequiredString(value, 'baseURL');

  try {
    const url = new URL(baseURL);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Unsupported URL protocol');
    }
  } catch {
    throw new ProviderInputError('baseURL must be a valid HTTP or HTTPS URL');
  }

  return baseURL;
}

function parseRequiredString(
  value: unknown,
  field: string,
  { allowEmpty = false }: { allowEmpty?: boolean } = {},
): string {
  if (typeof value !== 'string') {
    throw new ProviderInputError(`${field} must be a string`);
  }

  const result = value.trim();
  if (!allowEmpty && result.length === 0) {
    throw new ProviderInputError(`${field} is required`);
  }

  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
