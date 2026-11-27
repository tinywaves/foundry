import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { expect, it, vi } from 'vitest';

import {
  INSTRUCTION_BLOCK_END,
  INSTRUCTION_BLOCK_START,
  removeInstructionBlocks,
  renderInstructionDocument,
} from '../src/features/agents/document';
import { AgentsService } from '../src/features/agents/service';
import { InstructionsService } from '../src/features/instructions/service';
import { createApiApp } from '../src/server/api';
import { openFoundryStorage } from '../src/storage/index';

const { join } = path;

it('applies ordered instruction blocks and only removes Foundry content', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-agents-'));
  const home = join(directory, 'home');
  const codexFile = join(home, '.codex', 'AGENTS.md');
  const claudeFile = join(home, '.claude', 'CLAUDE.md');
  const storage = openFoundryStorage(directory);
  const instructions = new InstructionsService(storage);
  const agents = new AgentsService(storage, instructions, home);

  try {
    await mkdir(join(home, '.codex'), { recursive: true });
    await writeFile(codexFile, '# User rules\n\nKeep this content.\n');
    await chmod(codexFile, 0o644);

    const first = instructions.create({
      name: 'First',
      content: '# First\n\nUse the first instruction.',
    });
    const second = instructions.create({
      name: 'Second',
      content: '# Second\n\nUse the second instruction.',
    });

    expect(agents.list().map(({ id, instructionFile }) => ({
      id,
      instructionFile,
    }))).toEqual([
      { id: 'chatgpt', instructionFile: '~/.codex/AGENTS.md' },
      { id: 'claude-code', instructionFile: '~/.claude/CLAUDE.md' },
    ]);

    agents.updateInstructions('claude-code', [first.id]);
    expect(agents.setEnabled('claude-code', true)).toMatchObject({
      enabled: true,
      instructionIds: [first.id],
    });
    const claudeMarkdown = await readFile(claudeFile, 'utf8');
    expect(claudeMarkdown).toBe([
      INSTRUCTION_BLOCK_START,
      '',
      '# First',
      '',
      'Use the first instruction.',
      '',
      INSTRUCTION_BLOCK_END,
      '',
    ].join('\n'));
    if (process.platform !== 'win32') {
      const fileStat = await stat(claudeFile);
      expect(fileStat.mode & 0o777).toBe(0o600);
    }
    const assignmentDirectory = join(
      directory,
      'agents',
    );
    const assignmentFiles = await readdir(assignmentDirectory);
    expect(assignmentFiles).toHaveLength(1);
    const assignmentRecords = await Promise.all(
      assignmentFiles.map(async (filename) => JSON.parse(
        await readFile(join(assignmentDirectory, filename), 'utf8'),
      ) as Record<string, unknown>),
    );
    expect(assignmentRecords).toEqual([
      {
        id: 'claude-code',
        instructions: {
          instructionIds: [first.id],
          enabled: true,
          createdAt: expect.any(Number),
          updatedAt: expect.any(Number),
        },
      },
    ]);
    expect(await readdir(join(directory, 'instructions'))).not.toContain(
      'agents',
    );

    agents.updateInstructions('chatgpt', [second.id, first.id]);
    expect(await readFile(codexFile, 'utf8')).toBe(
      '# User rules\n\nKeep this content.\n',
    );

    const enabled = agents.setEnabled('chatgpt', true);
    expect(enabled).toMatchObject({
      enabled: true,
      instructionIds: [second.id, first.id],
    });
    let markdown = await readFile(codexFile, 'utf8');
    expect(markdown).toContain('# User rules\n\nKeep this content.\n');
    expect(markdown.indexOf('Use the second instruction.'))
      .toBeLessThan(markdown.indexOf('Use the first instruction.'));
    expect(countOccurrences(markdown, INSTRUCTION_BLOCK_START)).toBe(1);
    expect(countOccurrences(markdown, INSTRUCTION_BLOCK_END)).toBe(1);
    if (process.platform !== 'win32') {
      const fileStat = await stat(codexFile);
      expect(fileStat.mode & 0o777).toBe(0o644);
    }

    await writeFile(codexFile, `${markdown}${INSTRUCTION_BLOCK_START}
stale managed content
${INSTRUCTION_BLOCK_END}
${INSTRUCTION_BLOCK_END}
`);
    agents.reapply('chatgpt');
    markdown = await readFile(codexFile, 'utf8');
    expect(markdown).not.toContain('stale managed content');
    expect(countOccurrences(markdown, INSTRUCTION_BLOCK_START)).toBe(1);
    expect(countOccurrences(markdown, INSTRUCTION_BLOCK_END)).toBe(1);

    agents.updateInstructions('chatgpt', [first.id, second.id]);
    markdown = await readFile(codexFile, 'utf8');
    expect(markdown.indexOf('Use the first instruction.'))
      .toBeLessThan(markdown.indexOf('Use the second instruction.'));

    const disabled = agents.setEnabled('chatgpt', false);
    expect(disabled.enabled).toBe(false);
    markdown = await readFile(codexFile, 'utf8');
    expect(markdown).toBe('# User rules\n\nKeep this content.\n');

    agents.updateInstructions('chatgpt', [first.id]);
    const autoDisabled = agents.setEnabled('chatgpt', true);
    expect(autoDisabled.enabled).toBe(true);
    const removed = agents.updateInstructions('chatgpt', []);
    expect(removed.enabled).toBe(false);
    expect(await readFile(codexFile, 'utf8')).toBe(
      '# User rules\n\nKeep this content.\n',
    );
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it('removes an unmatched Foundry start marker and everything it manages', () => {
  expect(removeInstructionBlocks([
    '# User rules',
    '',
    INSTRUCTION_BLOCK_START,
    'managed content',
    '',
  ].join('\n'))).toBe('# User rules\n\n');
  expect(removeInstructionBlocks([
    '# User rules',
    '',
    INSTRUCTION_BLOCK_START,
    'managed content',
    INSTRUCTION_BLOCK_END,
    '',
  ].join('\n'))).toBe('# User rules\n\n');
  expect(removeInstructionBlocks([
    '# User rules',
    INSTRUCTION_BLOCK_END,
  ].join('\n'))).toBe('# User rules\n');
  expect(removeInstructionBlocks([
    '# User rules',
    '<!-- foundry:instructions:start',
    'malformed managed content',
  ].join('\n'))).toBe('# User rules\n');
  expect(removeInstructionBlocks([
    '# User rules',
    '<!-- foundry:managed:instructions:start -->',
    'nested managed content',
    INSTRUCTION_BLOCK_START,
    'inner managed content',
    INSTRUCTION_BLOCK_END,
    '<!-- foundry:instructions:end -->',
    'tail',
  ].join('\n'))).toBe('# User rules\ntail');
  expect(removeInstructionBlocks([
    '# User rules',
    '<!-- foundry:other-marker -->',
    'Keep this line.',
  ].join('\n'))).toBe('# User rules\nKeep this line.');
});

it('removes the managed block without changing surrounding line endings', () => {
  for (const existing of ['# User rules\n', '# User rules\n\n']) {
    const rendered = renderInstructionDocument(existing, ['Use this instruction.']);
    expect(rendered.startsWith(`${existing}${INSTRUCTION_BLOCK_START}`))
      .toBe(true);
    expect(removeInstructionBlocks(rendered)).toBe(existing);
  }
  expect(removeInstructionBlocks(
    renderInstructionDocument('# User rules', ['Use this instruction.']),
  )).toBe('# User rules\n');
});

it('updates, toggles, reapplies and opens agents through the API', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-agents-api-'));
  const home = join(directory, 'home');
  const codexFile = join(home, '.codex', 'AGENTS.md');
  const openFile = vi.fn();
  const storage = openFoundryStorage(directory);
  const instructions = new InstructionsService(storage);
  const agents = new AgentsService(storage, instructions, home, openFile);
  const app = createApiApp(storage, {
    agentsService: agents,
    instructionsService: instructions,
  });

  try {
    await mkdir(join(home, '.codex'), { recursive: true });
    await writeFile(codexFile, 'Existing content\n');
    const instruction = instructions.create({
      name: 'API instruction',
      content: '# API\n\nApplied through the API.',
    });

    const listResponse = await app.request('/api/agents');
    expect(listResponse.status).toBe(200);
    expect(await listResponse.json()).toMatchObject([
      { id: 'chatgpt', name: 'ChatGPT', enabled: false, instructionIds: [] },
      { id: 'claude-code', name: 'Claude Code', enabled: false, instructionIds: [] },
    ]);

    const assignmentResponse = await app.request('/api/agents/chatgpt/instructions', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ instructionIds: [instruction.id] }),
    });
    expect(assignmentResponse.status).toBe(200);
    expect(await assignmentResponse.json()).toMatchObject({
      enabled: false,
      instructionIds: [instruction.id],
    });

    const disabledReapplyResponse = await app.request(
      '/api/agents/chatgpt/reapply',
      { method: 'POST' },
    );
    expect(disabledReapplyResponse.status).toBe(409);
    expect(await disabledReapplyResponse.json()).toMatchObject({
      error: { code: 'AGENT_DISABLED' },
    });

    const unknownAgentResponse = await app.request(
      '/api/agents/missing/reapply',
      { method: 'POST' },
    );
    expect(unknownAgentResponse.status).toBe(404);
    expect(await unknownAgentResponse.json()).toMatchObject({
      error: { code: 'AGENT_NOT_FOUND' },
    });

    const enableResponse = await app.request('/api/agents/chatgpt/enabled', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: true }),
    });
    expect(enableResponse.status).toBe(200);
    expect(await readFile(codexFile, 'utf8')).toContain(
      'Applied through the API.',
    );

    const reapplyResponse = await app.request('/api/agents/chatgpt/reapply', {
      method: 'POST',
    });
    expect(reapplyResponse.status).toBe(200);
    expect(await readFile(codexFile, 'utf8')).toContain(
      'Applied through the API.',
    );

    const openResponse = await app.request('/api/agents/chatgpt/open-file', {
      method: 'POST',
    });
    expect(openResponse.status).toBe(200);
    expect(await openResponse.json()).toEqual({ path: '~/.codex/AGENTS.md' });
    expect(openFile).toHaveBeenCalledWith(codexFile);

    const duplicateResponse = await app.request('/api/agents/chatgpt/instructions', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ instructionIds: [instruction.id, instruction.id] }),
    });
    expect(duplicateResponse.status).toBe(400);
    expect(await duplicateResponse.json()).toMatchObject({
      error: { code: 'DUPLICATE_INSTRUCTION' },
    });

    const unknownInstructionResponse = await app.request(
      '/api/agents/chatgpt/instructions',
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ instructionIds: ['missing'] }),
      },
    );
    expect(unknownInstructionResponse.status).toBe(400);
    expect(await unknownInstructionResponse.json()).toMatchObject({
      error: { code: 'UNKNOWN_INSTRUCTION' },
    });

    const disableResponse = await app.request('/api/agents/chatgpt/enabled', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ enabled: false }),
    });
    expect(disableResponse.status).toBe(200);
    expect(await readFile(codexFile, 'utf8')).toBe('Existing content\n');

    const missingFileResponse = await app.request(
      '/api/agents/claude-code/open-file',
      { method: 'POST' },
    );
    expect(missingFileResponse.status).toBe(404);
    expect(await missingFileResponse.json()).toMatchObject({
      error: { code: 'AGENT_FILE_NOT_FOUND' },
    });
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});

function countOccurrences(source: string, value: string): number {
  return source.split(value).length - 1;
}
