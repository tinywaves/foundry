import { providerRuntimes } from '@dhzh/foundry-api-contract';
import { z } from 'zod';

const runtimeConfigurationTargetSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('official-default') }),
  z.strictObject({
    kind: z.literal('provider'),
    providerId: z.string().min(1),
  }),
]);

export const runtimePathSchema = z.strictObject({
  runtime: z.enum(providerRuntimes),
});

export const runtimesQuerySchema = z.strictObject({});

export const previewRuntimeConfigurationSchema = z.strictObject({
  providerKey: z.string().min(1).max(200).optional(),
  target: runtimeConfigurationTargetSchema,
});

export const applyRuntimeConfigurationSchema = z.strictObject({
  expectedFileHash: z.string().regex(/^[0-9a-f]{64}$/),
  providerKey: z.string().min(1).max(200).optional(),
  target: runtimeConfigurationTargetSchema,
});
