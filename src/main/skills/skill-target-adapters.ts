import { access, readFile, realpath, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { shouldAllowSkillTargetSymlinkEscapeByDefault } from '../../shared/skill-contract';
import type { SkillTargetKind } from '../../shared/skill-contract';

const CODEX_SKILLS_DOCUMENTATION_URL = 'https://developers.openai.com/codex/skills';
const PROFILE_NAME_PATTERN = /^[a-z0-9][\w-]{0,63}$/i;
type RuntimePlatform = typeof process.platform;

export interface SkillTargetAdapterContext {
  userHomeDirectory: string;
  environment?: Readonly<Record<string, string | undefined>>;
  platform?: RuntimePlatform;
}

export interface SkillTargetRootExclusion {
  name: string;
  caseSensitive: boolean;
}

export interface ResolvedBuiltInSkillTarget {
  kind: Exclude<SkillTargetKind, 'custom'>;
  displayName: string;
  brandingKey: string;
  configuredPath: string;
  resolvedPath: string;
  resolvedPathKey: string;
  documentationUrl: string | null;
  isWritable: boolean;
  defaultMaxScanDepth: number;
  defaultAllowSymlinkEscape: boolean;
  excludedRootEntries: SkillTargetRootExclusion[];
  sortOrder: number;
  hint: string | null;
}

interface BuiltInTargetDefinition {
  kind: ResolvedBuiltInSkillTarget['kind'];
  displayName: string;
  brandingKey: string;
  configuredPath: string;
  documentationUrl?: string;
  defaultMaxScanDepth?: number;
  excludedRootEntries?: SkillTargetRootExclusion[];
  sortOrder: number;
  hint?: string;
}

export async function resolveBuiltInSkillTargets(
  context: SkillTargetAdapterContext,
): Promise<ResolvedBuiltInSkillTarget[]> {
  if (!path.isAbsolute(context.userHomeDirectory)) {
    throw new Error('The user home directory must be absolute.');
  }
  const environment = context.environment ?? process.env;
  const platform = context.platform ?? process.platform;
  const userHome = context.userHomeDirectory;
  const definitions: BuiltInTargetDefinition[] = [
    {
      kind: 'generic-agent-skills',
      displayName: 'Agent Skills',
      brandingKey: 'agents',
      configuredPath: path.join(userHome, '.agents', 'skills'),
      sortOrder: 0,
    },
    {
      kind: 'claude-code',
      displayName: 'Claude Code',
      brandingKey: 'claude',
      configuredPath: path.join(userHome, '.claude', 'skills'),
      excludedRootEntries: [{ name: 'synced', caseSensitive: false }],
      sortOrder: 10,
    },
    {
      kind: 'gemini-cli',
      displayName: 'Gemini CLI',
      brandingKey: 'gemini',
      configuredPath: path.join(userHome, '.gemini', 'skills'),
      sortOrder: 20,
    },
    {
      kind: 'opencode',
      displayName: 'OpenCode',
      brandingKey: 'opencode',
      configuredPath: path.join(userHome, '.config', 'opencode', 'skills'),
      sortOrder: 30,
    },
    {
      kind: 'cursor',
      displayName: 'Cursor',
      brandingKey: 'cursor',
      configuredPath: path.join(userHome, '.cursor', 'skills'),
      defaultMaxScanDepth: 6,
      sortOrder: 40,
    },
    {
      kind: 'github-copilot',
      displayName: 'GitHub Copilot',
      brandingKey: 'github-copilot',
      configuredPath: path.join(userHome, '.copilot', 'skills'),
      sortOrder: 50,
    },
    {
      kind: 'hermes',
      displayName: 'Hermes Agent',
      brandingKey: 'hermes',
      configuredPath: path.join(
        await resolveHermesHome(userHome, environment, platform),
        'skills',
      ),
      defaultMaxScanDepth: 6,
      excludedRootEntries: [{ name: '.hub', caseSensitive: true }],
      sortOrder: 60,
    },
    {
      kind: 'openclaw',
      displayName: 'OpenClaw',
      brandingKey: 'openclaw',
      configuredPath: path.join(
        await resolveOpenClawStateDirectory(userHome, environment),
        'skills',
      ),
      defaultMaxScanDepth: 6,
      sortOrder: 70,
    },
    {
      kind: 'codex-legacy',
      displayName: 'Codex',
      brandingKey: 'codex',
      configuredPath: path.join(
        resolveEnvironmentPath(environment.CODEX_HOME, path.join(userHome, '.codex'), userHome),
        'skills',
      ),
      documentationUrl: CODEX_SKILLS_DOCUMENTATION_URL,
      excludedRootEntries: [{ name: '.system', caseSensitive: true }],
      sortOrder: 1000,
      hint: 'Legacy',
    },
  ];

  const resolvedTargets: ResolvedBuiltInSkillTarget[] = [];
  const seenPathKeys = new Set<string>();
  for (const definition of definitions) {
    const resolvedPath = await resolvePhysicalPath(definition.configuredPath);
    const resolvedPathKey = normalizeResolvedPathKey(resolvedPath, platform);
    if (seenPathKeys.has(resolvedPathKey)) {
      continue;
    }
    seenPathKeys.add(resolvedPathKey);
    resolvedTargets.push({
      kind: definition.kind,
      displayName: definition.displayName,
      brandingKey: definition.brandingKey,
      configuredPath: definition.configuredPath,
      resolvedPath,
      resolvedPathKey,
      documentationUrl: definition.documentationUrl ?? null,
      isWritable: await canWritePath(definition.configuredPath),
      defaultMaxScanDepth: definition.defaultMaxScanDepth ?? 4,
      defaultAllowSymlinkEscape: shouldAllowSkillTargetSymlinkEscapeByDefault,
      excludedRootEntries: definition.excludedRootEntries ?? [],
      sortOrder: definition.sortOrder,
      hint: definition.hint ?? null,
    });
  }
  return resolvedTargets;
}

export async function resolvePhysicalPath(configuredPath: string): Promise<string> {
  const absolutePath = path.resolve(configuredPath);
  let candidate = absolutePath;
  const missingSegments: string[] = [];

  for (;;) {
    try {
      return path.join(await realpath(candidate), ...missingSegments);
    } catch (error) {
      if (!hasFilesystemCode(error, 'ENOENT') && !hasFilesystemCode(error, 'ENOTDIR')) {
        throw error;
      }
      const parent = path.dirname(candidate);
      if (parent === candidate) {
        return absolutePath;
      }
      missingSegments.unshift(path.basename(candidate));
      candidate = parent;
    }
  }
}

export function normalizeResolvedPathKey(
  resolvedPath: string,
  platform: RuntimePlatform = process.platform,
): string {
  const normalized = path.normalize(resolvedPath);
  return platform === 'win32' ? normalized.toLowerCase() : normalized;
}

async function resolveHermesHome(
  userHome: string,
  environment: Readonly<Record<string, string | undefined>>,
  platform: RuntimePlatform,
): Promise<string> {
  const explicitHome = environment.HERMES_HOME?.trim();
  if (explicitHome) {
    return resolveEnvironmentPath(explicitHome, userHome, userHome);
  }
  const defaultHome = platform === 'win32'
    ? path.join(
        environment.LOCALAPPDATA?.trim() || path.join(userHome, 'AppData', 'Local'),
        'hermes',
      )
    : path.join(userHome, '.hermes');
  try {
    const profileFile = await readFile(path.join(defaultHome, 'active_profile'), 'utf8');
    const activeProfile = profileFile.trim();
    if (
      activeProfile
      && activeProfile.toLowerCase() !== 'default'
      && PROFILE_NAME_PATTERN.test(activeProfile)
    ) {
      return path.join(defaultHome, 'profiles', activeProfile);
    }
  } catch {
    // Missing or unreadable profile state falls back to the runtime's default home.
  }
  return defaultHome;
}

async function resolveOpenClawStateDirectory(
  userHome: string,
  environment: Readonly<Record<string, string | undefined>>,
): Promise<string> {
  const stateOverride = environment.OPENCLAW_STATE_DIR?.trim();
  if (stateOverride) {
    return resolveEnvironmentPath(stateOverride, userHome, userHome);
  }
  const profile = environment.OPENCLAW_PROFILE?.trim();
  if (profile && profile.toLowerCase() !== 'default' && PROFILE_NAME_PATTERN.test(profile)) {
    return path.join(userHome, `.openclaw-${profile}`);
  }
  const currentState = path.join(userHome, '.openclaw');
  if (await pathExists(currentState)) {
    return currentState;
  }
  const legacyState = path.join(userHome, '.clawdbot');
  return await pathExists(legacyState) ? legacyState : currentState;
}

function resolveEnvironmentPath(
  value: string | undefined,
  fallback: string,
  userHome: string,
): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallback;
  }
  if (trimmed === '~') {
    return userHome;
  }
  if (trimmed.startsWith(`~${path.sep}`) || trimmed.startsWith('~/')) {
    return path.join(userHome, trimmed.slice(2));
  }
  return path.isAbsolute(trimmed) ? path.normalize(trimmed) : path.resolve(userHome, trimmed);
}

async function canWritePath(targetPath: string): Promise<boolean> {
  let candidate = targetPath;
  for (;;) {
    try {
      const candidateStats = await stat(candidate);
      if (!candidateStats.isDirectory()) {
        return false;
      }
      await access(candidate, constants.W_OK);
      return true;
    } catch (error) {
      if (!hasFilesystemCode(error, 'ENOENT') && !hasFilesystemCode(error, 'ENOTDIR')) {
        return false;
      }
      const parent = path.dirname(candidate);
      if (parent === candidate) {
        return false;
      }
      candidate = parent;
    }
  }
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch (error) {
    if (hasFilesystemCode(error, 'ENOENT')) {
      return false;
    }
    throw error;
  }
}

function hasFilesystemCode(error: unknown, code: string): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === code;
}
