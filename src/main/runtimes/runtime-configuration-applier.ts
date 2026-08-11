import { randomUUID } from 'node:crypto';
import {
  chmod,
  copyFile,
  mkdir,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import path from 'node:path';
import {
  parse as parseToml,
  patch as patchToml,
  stringify as stringifyToml,
} from '@decimalturn/toml-patch';
import type { ProviderRuntime } from '../../shared/provider-contract';
import type {
  RuntimeConfigurationApplyInput,
  RuntimeSummary,
} from '../../shared/runtime-contract';
import { runtimeConfigurationManagedFieldKeys } from '../../shared/runtime-contract';
import { RuntimeOperationError } from './runtime-error';
import type {
  RuntimeConfigurationPlan,
  RuntimeConfigurationPlanField,
  RuntimeConfigurationPreviewer,
} from './runtime-configuration-previewer';
import { parseRuntimeConfigurationInput } from './runtime-configuration-previewer';
import type { RuntimeRepository } from './runtime-repository';

interface RuntimeConfigurationPlanner {
  createPlan: RuntimeConfigurationPreviewer['createPlan'];
}

interface RuntimeApplicationRecorder {
  recordProviderApplication: RuntimeRepository['recordProviderApplication'];
  recordOfficialDefaultApplication: RuntimeRepository['recordOfficialDefaultApplication'];
}

export interface RuntimeConfigurationFileOperations {
  ensureDirectory: (directory: string) => Promise<void>;
  writeNewFile: (filename: string, content: string) => Promise<void>;
  replaceFile: (source: string, destination: string) => Promise<void>;
  copySecureFile: (source: string, destination: string) => Promise<void>;
  removeFile: (filename: string) => Promise<void>;
}

const defaultFileOperations: RuntimeConfigurationFileOperations = {
  ensureDirectory: async (directory) => {
    await mkdir(directory, { recursive: true, mode: 0o700 });
  },
  writeNewFile: async (filename, content) => {
    await writeFile(filename, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    await chmod(filename, 0o600);
  },
  replaceFile: async (source, destination) => rename(source, destination),
  copySecureFile: async (source, destination) => {
    await copyFile(source, destination);
    await chmod(destination, 0o600);
  },
  removeFile: async (filename) => {
    try {
      await unlink(filename);
    } catch (error) {
      if (getFileErrorCode(error) !== 'ENOENT') {
        throw error;
      }
    }
  },
};

function getFileErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  return typeof error.code === 'string' ? error.code : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new RuntimeOperationError(
      'configuration-invalid',
      'Generated Runtime configuration is invalid.',
    );
  }
  return value;
}

function cloneRecord(value: Record<string, unknown>): Record<string, unknown> {
  return requireRecord(structuredClone(value));
}

function areConfigurationValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (left instanceof Date && right instanceof Date) {
    return left.toISOString() === right.toISOString();
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((value, index) => areConfigurationValuesEqual(value, right[index]));
  }
  if (!isRecord(left) || !isRecord(right)) {
    return false;
  }
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key) => (
      Object.hasOwn(right, key)
      && areConfigurationValuesEqual(left[key], right[key])
    ));
}

function setOwnString(
  parent: Record<string, unknown>,
  key: string,
  value: string | undefined,
): void {
  if (value === undefined) {
    delete parent[key];
    return;
  }
  Object.defineProperty(parent, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function getPlanField(
  fields: RuntimeConfigurationPlanField[],
  index: number,
): RuntimeConfigurationPlanField {
  const field = fields.at(index);
  if (!field) {
    throw new RuntimeOperationError('internal', 'Runtime configuration plan is incomplete.');
  }
  return field;
}

function getOrCreateRecord(
  parent: Record<string, unknown>,
  key: string,
): Record<string, unknown> {
  const existing = parent[key];
  if (existing !== undefined) {
    return requireRecord(existing);
  }
  const created: Record<string, unknown> = {};
  Object.defineProperty(parent, key, {
    configurable: true,
    enumerable: true,
    value: created,
    writable: true,
  });
  return created;
}

function applyCodexPlan(plan: RuntimeConfigurationPlan): Record<string, unknown> {
  const updated = cloneRecord(plan.source.values);
  const providerKey = plan.configurationProviderKey;
  if (providerKey === null) {
    throw new RuntimeOperationError('internal', 'Codex configuration plan is incomplete.');
  }

  setOwnString(updated, 'model', getPlanField(plan.fields, 0).proposedValue);
  setOwnString(updated, 'model_provider', getPlanField(plan.fields, 1).proposedValue);
  setOwnString(updated, 'forced_login_method', getPlanField(plan.fields, 2).proposedValue);

  const providerFields = plan.fields.slice(3);
  const hasProviderValues = providerFields.some((field) => field.proposedValue !== undefined);
  const existingModelProviders = updated.model_providers;
  if (existingModelProviders !== undefined && !isRecord(existingModelProviders)) {
    throw new RuntimeOperationError(
      'configuration-invalid',
      'Codex model_providers must be a table.',
    );
  }
  const modelProviders = hasProviderValues
    ? getOrCreateRecord(updated, 'model_providers')
    : existingModelProviders;
  if (!isRecord(modelProviders)) {
    return updated;
  }

  const existingProvider = modelProviders[providerKey];
  if (existingProvider !== undefined && !isRecord(existingProvider)) {
    throw new RuntimeOperationError(
      'configuration-invalid',
      'Codex configuration Provider must be a table.',
    );
  }
  const provider = hasProviderValues
    ? getOrCreateRecord(modelProviders, providerKey)
    : existingProvider;
  if (!isRecord(provider)) {
    return updated;
  }

  setOwnString(provider, 'name', getPlanField(plan.fields, 3).proposedValue);
  setOwnString(provider, 'base_url', getPlanField(plan.fields, 4).proposedValue);
  setOwnString(provider, 'wire_api', getPlanField(plan.fields, 5).proposedValue);
  setOwnString(
    provider,
    'experimental_bearer_token',
    getPlanField(plan.fields, 6).proposedValue,
  );
  if (Object.keys(provider).length === 0) {
    delete modelProviders[providerKey];
  }
  return updated;
}

function applyClaudeCodePlan(plan: RuntimeConfigurationPlan): Record<string, unknown> {
  const updated = cloneRecord(plan.source.values);
  const existingEnvironment = updated.env;
  if (existingEnvironment !== undefined && !isRecord(existingEnvironment)) {
    throw new RuntimeOperationError(
      'configuration-invalid',
      'Claude Code env must be an object.',
    );
  }
  const hasEnvironmentValues = plan.fields.some((field) => field.proposedValue !== undefined);
  const environment = hasEnvironmentValues
    ? getOrCreateRecord(updated, 'env')
    : existingEnvironment;
  if (!isRecord(environment)) {
    return updated;
  }

  const managedKeys = runtimeConfigurationManagedFieldKeys['claude-code'];
  for (const [index, key] of managedKeys.entries()) {
    setOwnString(
      environment,
      key.slice('env.'.length),
      getPlanField(plan.fields, index).proposedValue,
    );
  }
  if (Object.keys(environment).length === 0) {
    delete updated.env;
  }
  return updated;
}

function getJsonIndent(content: string): string | number | undefined {
  const indentation = (/(?:\r\n|\n)([\t ]+)"/).exec(content)?.[1];
  if (indentation === undefined) {
    return undefined;
  }
  return indentation.includes('\t') ? '\t' : indentation.length;
}

function stringifyJson(
  values: Record<string, unknown>,
  sourceContent: string | null,
): string {
  if (sourceContent === null) {
    return `${JSON.stringify(values, null, 2)}\n`;
  }
  const newline = sourceContent.includes('\r\n') ? '\r\n' : '\n';
  const hasTrailingNewline = (/(?:\r\n|\n)$/).test(sourceContent);
  let content = JSON.stringify(values, null, getJsonIndent(sourceContent));
  if (newline === '\r\n') {
    content = content.replaceAll('\n', '\r\n');
  }
  return hasTrailingNewline ? `${content}${newline}` : content;
}

function generateConfiguration(plan: RuntimeConfigurationPlan): {
  content: string;
  values: Record<string, unknown>;
} {
  if (plan.runtime === 'codex') {
    const values = applyCodexPlan(plan);
    return {
      content: plan.source.content === null
        ? stringifyToml(values)
        : patchToml(plan.source.content, values),
      values,
    };
  }
  const values = applyClaudeCodePlan(plan);
  return {
    content: stringifyJson(values, plan.source.content),
    values,
  };
}

function parseGeneratedConfiguration(
  runtime: ProviderRuntime,
  content: string,
): Record<string, unknown> {
  try {
    return requireRecord(runtime === 'codex' ? parseToml(content) : JSON.parse(content));
  } catch (error) {
    if (error instanceof RuntimeOperationError) {
      throw error;
    }
    throw new RuntimeOperationError(
      'configuration-invalid',
      'Generated Runtime configuration is invalid.',
    );
  }
}

function removeCodexManagedValues(
  values: Record<string, unknown>,
  providerKey: string,
): Record<string, unknown> {
  const unowned = cloneRecord(values);
  delete unowned.model;
  delete unowned.model_provider;
  delete unowned.forced_login_method;
  const modelProviders = unowned.model_providers;
  if (!isRecord(modelProviders)) {
    return unowned;
  }
  const provider = modelProviders[providerKey];
  if (!isRecord(provider)) {
    return unowned;
  }
  delete provider.name;
  delete provider.base_url;
  delete provider.wire_api;
  delete provider.experimental_bearer_token;
  if (Object.keys(provider).length === 0) {
    delete modelProviders[providerKey];
  }
  return unowned;
}

function removeClaudeCodeManagedValues(
  values: Record<string, unknown>,
): Record<string, unknown> {
  const unowned = cloneRecord(values);
  const environment = unowned.env;
  if (!isRecord(environment)) {
    return unowned;
  }
  const managedKeys = runtimeConfigurationManagedFieldKeys['claude-code'];
  for (const key of managedKeys) {
    delete environment[key.slice('env.'.length)];
  }
  if (Object.keys(environment).length === 0) {
    delete unowned.env;
  }
  return unowned;
}

function validateGeneratedConfiguration(
  plan: RuntimeConfigurationPlan,
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
): void {
  const providerKey = plan.configurationProviderKey;
  const expectedUnowned = plan.runtime === 'codex'
    ? removeCodexManagedValues(expected, providerKey ?? '')
    : removeClaudeCodeManagedValues(expected);
  const actualUnowned = plan.runtime === 'codex'
    ? removeCodexManagedValues(actual, providerKey ?? '')
    : removeClaudeCodeManagedValues(actual);
  if (!areConfigurationValuesEqual(expectedUnowned, actualUnowned)) {
    throw new RuntimeOperationError(
      'configuration-invalid',
      'Generated Runtime configuration did not preserve existing settings.',
    );
  }

  const expectedManaged = plan.runtime === 'codex'
    ? applyCodexPlan({ ...plan, source: { ...plan.source, values: expected } })
    : applyClaudeCodePlan({ ...plan, source: { ...plan.source, values: expected } });
  if (!areConfigurationValuesEqual(expectedManaged, actual)) {
    throw new RuntimeOperationError(
      'configuration-invalid',
      'Generated Runtime configuration did not match the requested target.',
    );
  }
}

function hasManagedChanges(plan: RuntimeConfigurationPlan): boolean {
  return plan.fields.some((field) => field.currentValue !== field.proposedValue);
}

function getOperationPath(basePath: string, kind: string): string {
  return path.join(
    path.dirname(basePath),
    `.${path.basename(basePath)}.foundry-${kind}-${randomUUID()}.tmp`,
  );
}

async function cleanUpFile(
  fileOperations: RuntimeConfigurationFileOperations,
  filename: string | undefined,
): Promise<void> {
  if (filename === undefined) {
    return;
  }
  try {
    await fileOperations.removeFile(filename);
  } catch {
    // The primary operation error remains more useful than temporary-file cleanup failure.
  }
}

export class RuntimeConfigurationApplier {
  private readonly inFlightRuntimes = new Set<ProviderRuntime>();

  constructor(
    private readonly planner: RuntimeConfigurationPlanner,
    private readonly recorder: RuntimeApplicationRecorder,
    private readonly fileOperations: RuntimeConfigurationFileOperations = defaultFileOperations,
  ) {}

  private async replaceConfiguration(plan: RuntimeConfigurationPlan): Promise<boolean> {
    const backupPath = `${plan.file.absolutePath}.foundry-backup`;
    if (!plan.file.exists) {
      try {
        await this.fileOperations.removeFile(backupPath);
      } catch {
        throw new RuntimeOperationError(
          'configuration-unavailable',
          'The previous Runtime configuration backup could not be cleared.',
        );
      }
    }
    if (!hasManagedChanges(plan)) {
      return false;
    }

    const directory = path.dirname(plan.file.absolutePath);
    let backupTemporaryPath: string | undefined;
    let configurationTemporaryPath: string | undefined;
    try {
      await this.fileOperations.ensureDirectory(directory);
      if (plan.file.exists) {
        if (plan.source.content === null) {
          throw new RuntimeOperationError('internal', 'Runtime configuration source is incomplete.');
        }
        backupTemporaryPath = getOperationPath(plan.file.absolutePath, 'backup');
        await this.fileOperations.writeNewFile(backupTemporaryPath, plan.source.content);
        await this.fileOperations.replaceFile(backupTemporaryPath, backupPath);
        backupTemporaryPath = undefined;
      }

      const generated = generateConfiguration(plan);
      configurationTemporaryPath = getOperationPath(plan.file.absolutePath, 'write');
      await this.fileOperations.writeNewFile(configurationTemporaryPath, generated.content);
      const parsed = parseGeneratedConfiguration(plan.runtime, generated.content);
      validateGeneratedConfiguration(plan, generated.values, parsed);
      await this.fileOperations.replaceFile(
        configurationTemporaryPath,
        plan.file.absolutePath,
      );
      configurationTemporaryPath = undefined;
      return true;
    } catch (error) {
      await Promise.all([
        cleanUpFile(this.fileOperations, backupTemporaryPath),
        cleanUpFile(this.fileOperations, configurationTemporaryPath),
      ]);
      if (error instanceof RuntimeOperationError) {
        throw error;
      }
      throw new RuntimeOperationError(
        'configuration-unavailable',
        'Runtime configuration could not be safely updated.',
      );
    }
  }

  private async restoreConfiguration(plan: RuntimeConfigurationPlan): Promise<void> {
    const backupPath = `${plan.file.absolutePath}.foundry-backup`;
    let recoveryTemporaryPath: string | undefined;
    try {
      if (!plan.file.exists) {
        await this.fileOperations.removeFile(plan.file.absolutePath);
        return;
      }
      recoveryTemporaryPath = getOperationPath(plan.file.absolutePath, 'recovery');
      await this.fileOperations.copySecureFile(backupPath, recoveryTemporaryPath);
      await this.fileOperations.replaceFile(recoveryTemporaryPath, plan.file.absolutePath);
      recoveryTemporaryPath = undefined;
    } catch {
      await cleanUpFile(this.fileOperations, recoveryTemporaryPath);
      throw new RuntimeOperationError(
        'configuration-unavailable',
        'Runtime configuration changed, but its previous content could not be restored.',
      );
    }
  }

  private recordApplication(
    input: RuntimeConfigurationApplyInput,
  ): RuntimeSummary {
    return input.target.kind === 'provider'
      ? this.recorder.recordProviderApplication(input.runtime, input.target.providerId)
      : this.recorder.recordOfficialDefaultApplication(input.runtime);
  }

  private async execute(input: RuntimeConfigurationApplyInput): Promise<RuntimeSummary> {
    const plan = await this.planner.createPlan(input);
    const didReplace = await this.replaceConfiguration(plan);
    try {
      return this.recordApplication(input);
    } catch (error) {
      if (didReplace) {
        await this.restoreConfiguration(plan);
      }
      throw error;
    }
  }

  async apply(inputValue: unknown): Promise<RuntimeSummary> {
    const input = parseRuntimeConfigurationInput(inputValue);
    if (this.inFlightRuntimes.has(input.runtime)) {
      throw new RuntimeOperationError(
        'conflict',
        'A configuration update is already running for this Runtime.',
      );
    }
    this.inFlightRuntimes.add(input.runtime);
    try {
      return await this.execute(input);
    } finally {
      this.inFlightRuntimes.delete(input.runtime);
    }
  }
}
