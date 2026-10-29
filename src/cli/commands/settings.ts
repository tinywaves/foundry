import { defineCommand } from 'citty';
import { parseSettingsPatch } from '../../features/settings/contracts';
import { parseBundledSkillCopyInput } from '../../features/settings/skill-copy-contracts';
import {
  JSON_INPUT_ARGS,
  readJsonInput,
  runCliAction,
} from '../shared';

const get = defineCommand({
  meta: {
    name: 'get',
    description: 'Read Foundry settings as JSON',
    alias: ['show'],
  },
  run() {
    return runCliAction(({ runtime }) => runtime.services.settingsService.read());
  },
});

const update = defineCommand({
  meta: {
    name: 'update',
    description: 'Apply a settings patch',
  },
  args: JSON_INPUT_ARGS,
  run({ args }) {
    return runCliAction(async ({ runtime }) => {
      const patch = parseSettingsPatch(await readJsonInput(args));
      return runtime.services.settingsService.update(patch);
    });
  },
});

const open = defineCommand({
  meta: {
    name: 'open',
    description: 'Open the Foundry configuration folder',
  },
  run() {
    return runCliAction(({ runtime }) =>
      runtime.services.settingsService.openConfigFolder());
  },
});

const downloadSkill = defineCommand({
  meta: {
    name: 'download-skill',
    description: 'Copy the bundled Foundry skill into user-level skill targets',
  },
  args: {
    target: {
      type: 'string',
      description: 'Comma-separated targets: .agents, .claude',
      valueHint: '.agents,.claude',
      required: true,
    },
  },
  run({ args }) {
    return runCliAction(({ runtime }) => {
      const input = parseBundledSkillCopyInput({
        targets: args.target.split(',').map((target) =>
          target.trim().replace(/^\./u, '')),
      });
      return runtime.services.settingsSkillCopyService.copyToTargets(input.targets);
    });
  },
});

export const settingsCommand = defineCommand({
  meta: {
    name: 'settings',
    description: 'Read or update Foundry settings',
  },
  subCommands: {
    get,
    update,
    open,
    'download-skill': downloadSkill,
  },
});
