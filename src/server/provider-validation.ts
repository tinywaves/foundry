import {
  claudeApiKeyHeaders,
  claudeModelCapabilities,
  providerAvatarMimeTypes,
  providerRuntimes,
} from '@dhzh/foundry-api-contract';
import type {
  ClaudeCodeProviderConfiguration,
  CodexProviderConfiguration,
  CreateProviderRequest,
  ProviderAvatar,
  ProviderAvatarMimeType,
} from '@dhzh/foundry-api-contract';
import { Buffer } from 'node:buffer';
import { TextDecoder } from 'node:util';
import { z } from 'zod';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const MAX_AVATAR_BASE64_LENGTH = Math.ceil(MAX_AVATAR_BYTES / 3) * 4;
const MAX_API_KEY_LENGTH = 16 * 1024;
const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/u;

function hasControlCharacters(value: string, canContainWhitespace: boolean): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    const isAllowedWhitespace = canContainWhitespace
      && [0x09, 0x0A, 0x0D].includes(codePoint);
    if (codePoint === 0x7F || (!isAllowedWhitespace && codePoint < 0x20)) {
      return true;
    }
  }
  return false;
}

function textSchema(maximumLength: number) {
  return z.string()
    .trim()
    .max(maximumLength)
    .refine((value) => !hasControlCharacters(value, true), {
      message: 'Control characters are not allowed.',
    });
}

function nullableTextSchema(maximumLength: number) {
  return textSchema(maximumLength)
    .nullable()
    .transform((value) => (value === '' ? null : value));
}

function isHttpUrl(value: string, canIncludeQueryAndFragment: boolean): boolean {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol)
      && url.username === ''
      && url.password === ''
      && (canIncludeQueryAndFragment || (url.search === '' && url.hash === ''));
  } catch {
    return false;
  }
}

const baseUrlSchema = textSchema(2048)
  .min(1)
  .refine((value) => isHttpUrl(value, false), {
    message: 'Provide an HTTP or HTTPS URL without credentials, a query, or a fragment.',
  });
const officialWebsiteSchema = nullableTextSchema(2048)
  .refine((value) => value === null || isHttpUrl(value, true), {
    message: 'Provide an HTTP or HTTPS URL without credentials.',
  });
const requiredNameSchema = textSchema(100).min(1);
const optionalNameSchema = nullableTextSchema(100);
const optionalDescriptionSchema = nullableTextSchema(2000);
const requiredModelSchema = textSchema(200).min(1);
const optionalModelSchema = nullableTextSchema(200);
const optionalRemarkSchema = nullableTextSchema(2000);
const apiKeySchema = z.string()
  .min(1)
  .max(MAX_API_KEY_LENGTH)
  .refine((value) => !hasControlCharacters(value, false), {
    message: 'Control characters are not allowed.',
  });
const optionalApiKeySchema = z.union([apiKeySchema, z.literal(''), z.null()])
  .transform((value) => (value === '' ? null : value));

function hasImageSignature(
  mimeType: ProviderAvatarMimeType,
  data: Buffer,
): boolean {
  if (mimeType === 'image/png') {
    return [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]
      .every((byte, index) => data[index] === byte);
  }
  if (mimeType === 'image/jpeg') {
    return data[0] === 0xFF && data[1] === 0xD8 && data[2] === 0xFF;
  }
  if (mimeType === 'image/svg+xml') {
    try {
      const content = new TextDecoder('utf-8', { fatal: true }).decode(data);
      return (/^\s*(?:(?:<\?xml[\s\S]*?\?>|<!--[\s\S]*?-->|<!DOCTYPE[\s\S]*?>)\s*)*<svg(?:\s|>)/u)
        .test(content);
    } catch {
      return false;
    }
  }
  return data[0] === 0x52
    && data[1] === 0x49
    && data[2] === 0x46
    && data[3] === 0x46
    && data[8] === 0x57
    && data[9] === 0x45
    && data[10] === 0x42
    && data[11] === 0x50;
}

const providerAvatarSchema = z.strictObject({
  data: z.string().min(1).max(MAX_AVATAR_BASE64_LENGTH),
  mimeType: z.enum(providerAvatarMimeTypes),
}).superRefine((avatar, context) => {
  if (!base64Pattern.test(avatar.data)) {
    context.addIssue({
      code: 'custom',
      message: 'Avatar data must be valid Base64.',
    });
    return;
  }

  const data = Buffer.from(avatar.data, 'base64');
  if (
    data.byteLength === 0
    || data.byteLength > MAX_AVATAR_BYTES
    || data.toString('base64') !== avatar.data
    || !hasImageSignature(avatar.mimeType, data)
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Avatar data must be a valid PNG, JPEG, WebP, or SVG image no larger than 2 MB.',
    });
  }
});

const supportedCapabilitiesSchema = z.array(z.enum(claudeModelCapabilities))
  .max(claudeModelCapabilities.length)
  .refine(
    (capabilities) => new Set(capabilities).size === capabilities.length,
    { message: 'Model capabilities must be unique.' },
  );

const claudeModelConfigurationSchema = z.strictObject({
  description: optionalDescriptionSchema,
  displayName: optionalNameSchema,
  model: requiredModelSchema,
  supportedCapabilities: supportedCapabilitiesSchema,
});

export const codexProviderConfigurationSchema = z.strictObject({
  apiKey: optionalApiKeySchema,
  baseUrl: baseUrlSchema,
  primaryModel: requiredModelSchema,
  protocol: z.literal('responses'),
  reviewModel: optionalModelSchema,
});

export const claudeCodeProviderConfigurationSchema = z.strictObject({
  apiKey: apiKeySchema,
  apiKeyHeader: z.enum(claudeApiKeyHeaders),
  baseUrl: baseUrlSchema,
  fableModel: claudeModelConfigurationSchema.nullable(),
  haikuModel: claudeModelConfigurationSchema.nullable(),
  opusModel: claudeModelConfigurationSchema.nullable(),
  primaryModel: claudeModelConfigurationSchema,
  protocol: z.literal('messages'),
  sonnetModel: claudeModelConfigurationSchema.nullable(),
  subagentModel: optionalModelSchema,
});

const commonProviderFields = {
  avatar: providerAvatarSchema.nullable(),
  name: requiredNameSchema,
  officialWebsite: officialWebsiteSchema,
  remark: optionalRemarkSchema,
};

export const providerCreationSchema = z.discriminatedUnion('runtime', [
  z.strictObject({
    ...commonProviderFields,
    configuration: codexProviderConfigurationSchema,
    runtime: z.literal('codex'),
  }),
  z.strictObject({
    ...commonProviderFields,
    configuration: claudeCodeProviderConfigurationSchema,
    runtime: z.literal('claude-code'),
  }),
]);

export const providersQuerySchema = z.strictObject({
  runtime: z.enum(providerRuntimes),
});

export function parseCreateProviderRequest(input: unknown): CreateProviderRequest {
  return providerCreationSchema.parse(input);
}

export function parseCodexProviderConfiguration(
  configuration: unknown,
): CodexProviderConfiguration {
  return codexProviderConfigurationSchema.parse(configuration);
}

export function parseClaudeCodeProviderConfiguration(
  configuration: unknown,
): ClaudeCodeProviderConfiguration {
  return claudeCodeProviderConfigurationSchema.parse(configuration);
}

export function decodeProviderAvatar(avatar: ProviderAvatar | null): Buffer | null {
  return avatar === null
    ? null
    : Buffer.from(providerAvatarSchema.parse(avatar).data, 'base64');
}
