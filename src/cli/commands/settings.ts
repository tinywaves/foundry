import { defineCommand } from 'citty';
import { LANGUAGE_MODES, THEME_MODES, TIME_FORMATS, TIME_ZONES } from '@dhzh/foundry-shared';
import type { SettingsPayload } from '@dhzh/foundry-shared';
import { parseSettingsPatch } from '../../features/settings/contracts';
import { parseBundledSkillCopyInput } from '../../features/settings/skill-copy-contracts';
import { CliInputError, runCliAction } from '../shared';
import { exportCommand, importBackup } from './backups';

const editableSettings = {
  'color-theme': { field: 'theme', values: THEME_MODES },
  'language': { field: 'language', values: LANGUAGE_MODES },
  'time-zone': { field: 'timezone', values: TIME_ZONES },
  'time-format': { field: 'timeFormat', values: TIME_FORMATS },
} as const;

const keys = [...Object.keys(editableSettings), 'config-folder'];
const valuesHelp = Object.entries(editableSettings)
  .map(([key, { values }]) => `${key}: ${values.join(' | ')}`)
  .join('\n');

function selectSettings(settings: SettingsPayload) {
  return {
    'color-theme': settings.workspace.appearance['color-theme'],
    ...settings.workspace['language-region'],
    'config-folder': settings.configFolder,
  };
}

const get = defineCommand({
  meta: { name: 'get', description: 'Read all current settings, or one setting, as JSON' },
  args: {
    key: { type: 'positional', description: `Optional key: ${keys.join(', ')} (config-folder is read-only)`, required: false },
  },
  run({ args }) {
    return runCliAction(({ settingsService }) => {
      const settings = selectSettings(settingsService.read());
      if (args.key === undefined) {
        return settings;
      }
      if (!Object.hasOwn(settings, args.key)) {
        throw new CliInputError('UNKNOWN_SETTING', `Unknown setting. Available keys: ${keys.join(', ')}`);
      }
      return settings[args.key as keyof typeof settings];
    });
  },
});

const set = defineCommand({
  meta: { name: 'set', description: 'Set one setting; --help lists allowed values' },
  args: {
    key: { type: 'positional', description: `Setting key: ${Object.keys(editableSettings).join(', ')}`, required: true },
    value: { type: 'positional', description: `Allowed values (quote values containing spaces):\n${valuesHelp}`, required: true },
  },
  run({ args }) {
    return runCliAction(({ settingsService }) => {
      if (args.key === 'config-folder') {
        throw new CliInputError('READ_ONLY_SETTING', 'config-folder is read-only');
      }
      if (!Object.hasOwn(editableSettings, args.key)) {
        throw new CliInputError('UNKNOWN_SETTING', `Unknown setting. Editable keys: ${Object.keys(editableSettings).join(', ')}`);
      }
      const definition = editableSettings[args.key as keyof typeof editableSettings];
      if (!(definition.values as readonly string[]).includes(args.value)) {
        throw new CliInputError('INVALID_SETTINGS_INPUT', `Invalid ${args.key}. Allowed values: ${definition.values.join(' | ')}`);
      }
      const settings = selectSettings(settingsService.update(parseSettingsPatch({ [definition.field]: args.value })));
      return { key: args.key, value: settings[args.key as keyof typeof settings] };
    });
  },
});

const open = defineCommand({
  meta: { name: 'open', description: 'Open the Foundry configuration folder' },
  run() {
    return runCliAction(({ settingsService }) => settingsService.openConfigFolder());
  },
});

const downloadSkill = defineCommand({
  meta: { name: 'download-skill', description: 'Copy the bundled Foundry skill into user-level skill targets' },
  args: {
    target: { type: 'string', description: 'Comma-separated targets: .agents, .claude', valueHint: '.agents,.claude', required: true },
  },
  run({ args }) {
    return runCliAction(({ settingsSkillCopyService }) => {
      const input = parseBundledSkillCopyInput({
        targets: args.target.split(',').map((target) => target.trim().replace(/^\./u, '')),
      });
      return settingsSkillCopyService.copyToTargets(input.targets);
    });
  },
});

export const settingsCommand = defineCommand({
  meta: { name: 'settings', description: 'Manage Foundry settings; use set --help for allowed values' },
  subCommands: {
    get,
    set,
    'config-folder': defineCommand({ meta: { name: 'config-folder', description: 'Configuration folder actions' }, subCommands: { open } }),
    'export': exportCommand,
    'import': importBackup,
    'download-skill': downloadSkill,
  },
});
