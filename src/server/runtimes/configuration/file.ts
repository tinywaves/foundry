import type {
  ProviderRuntime,
  RuntimeConfigurationPreview,
  RuntimeConfigurationPreviewField,
  RuntimeConfigurationPreviewValue,
} from '@dhzh/foundry-api-contract';
import { parse as parseToml, patch as patchToml, stringify as stringifyToml } from '@decimalturn/toml-patch';
import { createHash, randomUUID } from 'node:crypto';
import {
  chmod,
  lstat,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';

import { RuntimeOperationError } from '../error';

export interface ConfigurationSource {
  content: string | null;
  exists: boolean;
  hash: string;
  mode: number;
  values: Record<string, unknown>;
}

export interface ConfigurationPlan {
  content: string;
  preview: Extract<RuntimeConfigurationPreview, { kind: 'ready' }>;
  source: ConfigurationSource;
}

export interface RuntimeConfigurationChange {
  rollback: () => Promise<void>;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function serializeValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  const serialized = JSON.stringify(value);
  return typeof serialized === 'string' ? serialized : String(value);
}

function previewValue(
  value: unknown,
  isSecret: boolean,
): RuntimeConfigurationPreviewValue {
  if (value === undefined) {
    return { kind: 'absent' };
  }
  return isSecret
    ? { kind: 'secret', value: serializeValue(value) }
    : { kind: 'plain', value: serializeValue(value) };
}

export function createPreviewField(
  key: string,
  current: unknown,
  proposed: string | undefined,
  isSecret = false,
): RuntimeConfigurationPreviewField {
  let operation: RuntimeConfigurationPreviewField['operation'];
  if (current === undefined && proposed === undefined) {
    operation = 'unchanged';
  } else if (current === undefined) {
    operation = 'add';
  } else if (proposed === undefined) {
    operation = 'remove';
  } else if (current === proposed) {
    operation = 'unchanged';
  } else {
    operation = 'update';
  }

  return {
    current: previewValue(current, isSecret),
    key,
    operation,
    proposed: previewValue(proposed, isSecret),
  };
}

export function splitFields(fields: RuntimeConfigurationPreviewField[]) {
  return {
    changes: fields.filter((field) => field.operation !== 'unchanged'),
    unchanged: fields.filter((field) => field.operation === 'unchanged'),
  };
}

function configurationHash(content: string | null): string {
  return createHash('sha256')
    .update(content === null ? 'absent\0' : `present\0${content}`)
    .digest('hex');
}

function parseConfiguration(
  runtime: ProviderRuntime,
  content: string,
): Record<string, unknown> {
  try {
    const parsed = runtime === 'codex' ? parseToml(content) : JSON.parse(content);
    if (!isRecord(parsed)) {
      throw new Error('Configuration root must be an object.');
    }
    return parsed;
  } catch {
    throw new RuntimeOperationError(
      'RUNTIME_CONFIGURATION_INVALID',
      `The ${runtime === 'codex' ? 'Codex' : 'Claude Code'} configuration cannot be safely parsed.`,
    );
  }
}

export async function readConfiguration(
  runtime: ProviderRuntime,
  filename: string,
): Promise<ConfigurationSource> {
  try {
    const file = await lstat(filename);
    if (!file.isFile()) {
      throw new RuntimeOperationError(
        'RUNTIME_CONFIGURATION_INVALID',
        'The Runtime configuration path is not a regular file.',
      );
    }
    const content = await readFile(filename, 'utf8');
    return {
      content,
      exists: true,
      hash: configurationHash(content),
      mode: file.mode & 0o777,
      values: parseConfiguration(runtime, content),
    };
  } catch (error) {
    if (
      error
      && typeof error === 'object'
      && 'code' in error
      && error.code === 'ENOENT'
    ) {
      return {
        content: null,
        exists: false,
        hash: configurationHash(null),
        mode: 0o600,
        values: {},
      };
    }
    if (error instanceof RuntimeOperationError) {
      throw error;
    }
    throw new RuntimeOperationError(
      'RUNTIME_APPLY_FAILED',
      'The Runtime configuration could not be read.',
    );
  }
}

export function cloneValues(
  values: Record<string, unknown>,
): Record<string, unknown> {
  return structuredClone(values);
}

export function setString(
  record: Record<string, unknown>,
  key: string,
  value: string | undefined,
): void {
  if (value === undefined) {
    delete record[key];
  } else {
    record[key] = value;
  }
}

export function stringifyCodex(
  source: ConfigurationSource,
  values: Record<string, unknown>,
): string {
  return source.content === null
    ? stringifyToml(values)
    : patchToml(source.content, values);
}

function jsonIndent(content: string): string | number | undefined {
  const indentation = (/(?:\r\n|\n)([\t ]+)"/).exec(content)?.[1];
  if (indentation === undefined) {
    return undefined;
  }
  return indentation.includes('\t') ? '\t' : indentation.length;
}

export function stringifyClaude(
  source: ConfigurationSource,
  values: Record<string, unknown>,
): string {
  if (source.content === null) {
    return `${JSON.stringify(values, null, 2)}\n`;
  }
  const newline = source.content.includes('\r\n') ? '\r\n' : '\n';
  const hasTrailingNewline = source.content.endsWith('\n');
  let content = JSON.stringify(values, null, jsonIndent(source.content));
  if (newline === '\r\n') {
    content = content.replaceAll('\n', '\r\n');
  }
  return hasTrailingNewline ? `${content}${newline}` : content;
}

function temporaryPath(filename: string, purpose: string): string {
  return path.join(
    path.dirname(filename),
    `.${path.basename(filename)}.foundry-${purpose}-${randomUUID()}.tmp`,
  );
}

async function writeReplacement(
  filename: string,
  content: string,
  mode: number,
  purpose: string,
): Promise<void> {
  const temporary = temporaryPath(filename, purpose);
  try {
    await writeFile(temporary, content, { encoding: 'utf8', flag: 'wx', mode });
    await chmod(temporary, mode);
    await rename(temporary, filename);
  } catch (error) {
    try {
      await rm(temporary, { force: true });
    } catch {}
    throw error;
  }
}

export async function applyConfigurationPlan(
  runtime: ProviderRuntime,
  filename: string,
  plan: ConfigurationPlan,
  expectedFileHash: string,
): Promise<RuntimeConfigurationChange> {
  if (plan.source.hash !== expectedFileHash) {
    throw new RuntimeOperationError(
      'RUNTIME_CONFIGURATION_CHANGED',
      'The Runtime configuration changed after Preview. Refresh and review it again.',
    );
  }

  const { source } = plan;
  const filenameDirectory = path.dirname(filename);
  const backupPath = `${filename}.foundry-backup`;
  const requiresWrite = !source.exists || plan.content !== source.content;
  if (!requiresWrite) {
    return { rollback: async () => {} };
  }
  parseConfiguration(runtime, plan.content);

  try {
    await mkdir(filenameDirectory, { mode: 0o700, recursive: true });
    if (source.exists && source.content !== null) {
      await writeReplacement(backupPath, source.content, 0o600, 'backup');
    } else {
      await rm(backupPath, { force: true });
    }
    await writeReplacement(filename, plan.content, source.mode, 'write');
  } catch (error) {
    if (error instanceof RuntimeOperationError) {
      throw error;
    }
    throw new RuntimeOperationError(
      'RUNTIME_APPLY_FAILED',
      'The Runtime configuration could not be safely updated.',
    );
  }

  return {
    rollback: async () => {
      try {
        if (source.exists && source.content !== null) {
          await writeReplacement(filename, source.content, source.mode, 'rollback');
        } else {
          await rm(filename, { force: true });
        }
      } catch {
        throw new RuntimeOperationError(
          'RUNTIME_APPLY_FAILED',
          'The previous Runtime configuration could not be restored.',
        );
      }
    },
  };
}
