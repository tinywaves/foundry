import type {
  ClaudeCodeModelConfigV1,
  ClaudeCodeModelMapping,
  CodexModelConfigV1,
  CreateProviderInput,
  ProviderAvatar,
  ProviderAvatarMimeType,
  ProviderConnectionTestInput,
  ProviderModelConfig,
  ProviderRuntime,
  UpdateProviderInput,
} from '../../shared/provider-contract';
import { providerAvatarMimeTypes, providerRuntimes } from '../../shared/provider-contract';
import { invalidProviderField, ProviderOperationError } from './provider-error';

export const PROVIDER_MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type ModelConfigForRuntime<T extends ProviderRuntime>
  = T extends 'codex' ? CodexModelConfigV1 : ClaudeCodeModelConfigV1;

export function parseProviderRuntime(value: unknown): ProviderRuntime {
  if (typeof value !== 'string' || !providerRuntimes.includes(value as ProviderRuntime)) {
    return invalidProviderField('runtime', 'Select a supported runtime.');
  }
  return value as ProviderRuntime;
}

export function parseProviderId(value: unknown): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    return invalidProviderField('id', 'Provide a valid Provider ID.');
  }
  return value;
}

export function parseCreateProviderInput(value: unknown): CreateProviderInput {
  const input = requireRecord(value, 'provider');
  const runtime = parseProviderRuntime(input.runtime);
  const common = parseCommonInput(input);
  const modelConfig = parseModelConfig(runtime, input.modelConfig);

  return runtime === 'codex'
    ? { ...common, runtime, modelConfig: modelConfig as CodexModelConfigV1 }
    : { ...common, runtime, modelConfig: modelConfig as ClaudeCodeModelConfigV1 };
}

export function parseUpdateProviderInput(value: unknown): UpdateProviderInput {
  const input = requireRecord(value, 'provider');
  return {
    ...parseCreateProviderInput(input),
    id: parseProviderId(input.id),
  };
}

export function parseProviderConnectionTestInput(value: unknown): ProviderConnectionTestInput {
  const input = requireRecord(value, 'connection');
  return {
    runtime: parseProviderRuntime(input.runtime),
    baseUrl: parseBaseUrl(input.baseUrl),
    apiKey: parseApiKey(input.apiKey),
  };
}

export function parseStoredModelConfig<T extends ProviderRuntime>(
  runtime: T,
  version: number,
  json: string,
): ModelConfigForRuntime<T> {
  try {
    if (version !== 1) {
      throw new Error('Unsupported model configuration version.');
    }
    return parseModelConfig(runtime, JSON.parse(json)) as ModelConfigForRuntime<T>;
  } catch {
    throw new ProviderOperationError('storage-corrupt', 'Stored Provider data is invalid.');
  }
}

export function parseStoredAvatar(mimeType: unknown, bytes: unknown): ProviderAvatar | null {
  if (mimeType === null && bytes === null) {
    return null;
  }
  if (mimeType === null || bytes === null) {
    throw new ProviderOperationError('storage-corrupt', 'Stored Provider avatar is invalid.');
  }

  try {
    const avatar = parseAvatar({ mimeType, bytes });
    if (avatar === null) {
      throw new Error('Stored avatar is unexpectedly empty.');
    }
    return avatar;
  } catch {
    throw new ProviderOperationError('storage-corrupt', 'Stored Provider avatar is invalid.');
  }
}

function parseCommonInput(input: Record<string, unknown>) {
  return {
    name: requireTrimmedString(input.name, 'name'),
    baseUrl: parseBaseUrl(input.baseUrl),
    apiKey: parseApiKey(input.apiKey),
    remark: parseOptionalTrimmedString(input.remark, 'remark'),
    officialWebsite: parseOfficialWebsite(input.officialWebsite),
    ...(input.avatar !== undefined && { avatar: parseAvatar(input.avatar) }),
  };
}

function parseModelConfig(runtime: ProviderRuntime, value: unknown): ProviderModelConfig {
  const config = requireRecord(value, 'modelConfig');
  if (config.version !== 1) {
    return invalidProviderField('modelConfig.version', 'Use model configuration version 1.');
  }

  if (runtime === 'codex') {
    return {
      version: 1,
      defaultModel: requireTrimmedString(config.defaultModel, 'modelConfig.defaultModel'),
    };
  }

  return {
    version: 1,
    sonnet: parseModelMapping(config.sonnet, 'sonnet'),
    opus: parseModelMapping(config.opus, 'opus'),
    fable: parseModelMapping(config.fable, 'fable'),
    haiku: parseModelMapping(config.haiku, 'haiku'),
    subagent: {
      requestModel: requireTrimmedString(
        requireRecord(config.subagent, 'modelConfig.subagent').requestModel,
        'modelConfig.subagent.requestModel',
      ),
    },
    defaultFallbackModel: requireTrimmedString(
      config.defaultFallbackModel,
      'modelConfig.defaultFallbackModel',
    ),
  };
}

function parseModelMapping(value: unknown, role: string): ClaudeCodeModelMapping {
  const mapping = requireRecord(value, `modelConfig.${role}`);
  return {
    displayName: requireTrimmedString(mapping.displayName, `modelConfig.${role}.displayName`),
    requestModel: requireTrimmedString(mapping.requestModel, `modelConfig.${role}.requestModel`),
  };
}

function parseBaseUrl(value: unknown): string {
  const url = parseHttpUrl(value, 'baseUrl');
  if (url.parsed.search || url.parsed.hash) {
    return invalidProviderField('baseUrl', 'Base URL cannot contain a query or fragment.');
  }
  return url.original;
}

function parseOfficialWebsite(value: unknown): string | null {
  const normalized = parseOptionalTrimmedString(value, 'officialWebsite');
  if (normalized === null) {
    return null;
  }
  return parseHttpUrl(normalized, 'officialWebsite').original;
}

function parseHttpUrl(value: unknown, field: string): { original: string; parsed: URL } {
  const original = requireTrimmedString(value, field);
  let parsed: URL;
  try {
    parsed = new URL(original);
  } catch {
    return invalidProviderField(field, 'Provide a valid HTTP or HTTPS URL.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return invalidProviderField(field, 'Use an HTTP or HTTPS URL.');
  }
  if (parsed.username || parsed.password) {
    return invalidProviderField(field, 'URL credentials are not allowed.');
  }
  return { original, parsed };
}

function parseApiKey(value: unknown): string | null {
  if ([null, undefined, ''].includes(value as null | undefined | string)) {
    return null;
  }
  if (typeof value !== 'string') {
    return invalidProviderField('apiKey', 'API key must be text.');
  }
  return value;
}

function parseAvatar(value: unknown): ProviderAvatar | null {
  if (value === null) {
    return null;
  }
  const avatar = requireRecord(value, 'avatar');
  const mimeType = avatar.mimeType;
  if (
    typeof mimeType !== 'string'
    || !providerAvatarMimeTypes.includes(mimeType as ProviderAvatarMimeType)
  ) {
    return invalidProviderField('avatar.mimeType', 'Use a PNG, JPEG, or WebP image.');
  }
  if (!(avatar.bytes instanceof Uint8Array)) {
    return invalidProviderField('avatar.bytes', 'Avatar data is invalid.');
  }
  if (avatar.bytes.byteLength === 0 || avatar.bytes.byteLength > PROVIDER_MAX_AVATAR_BYTES) {
    return invalidProviderField('avatar.bytes', 'Avatar must be no larger than 2 MB.');
  }
  if (!isMatchingImageSignature(mimeType as ProviderAvatarMimeType, avatar.bytes)) {
    return invalidProviderField('avatar.bytes', 'Avatar content does not match its image type.');
  }
  return {
    mimeType: mimeType as ProviderAvatarMimeType,
    bytes: new Uint8Array(avatar.bytes),
  };
}

export function inferProviderAvatarMimeType(bytes: Uint8Array): ProviderAvatarMimeType | null {
  return providerAvatarMimeTypes.find((mimeType) => isMatchingImageSignature(mimeType, bytes))
    ?? null;
}

function isMatchingImageSignature(mimeType: ProviderAvatarMimeType, bytes: Uint8Array): boolean {
  if (mimeType === 'image/png') {
    const signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    return signature.every((byte, index) => bytes[index] === byte);
  }
  if (mimeType === 'image/jpeg') {
    return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
  }
  return bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50;
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return invalidProviderField(field, 'Provide an object value.');
  }
  return value as Record<string, unknown>;
}

function requireTrimmedString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    return invalidProviderField(field, 'This field is required.');
  }
  return value.trim();
}

function parseOptionalTrimmedString(value: unknown, field: string): string | null {
  if ([null, undefined, ''].includes(value as null | undefined | string)) {
    return null;
  }
  if (typeof value !== 'string') {
    return invalidProviderField(field, 'This field must be text.');
  }
  return value.trim() || null;
}
