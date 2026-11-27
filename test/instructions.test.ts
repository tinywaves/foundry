import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';

import { AgentsService } from '../src/features/agents/service';
import {
  parseInstructionMarkdown,
} from '../src/features/instructions/repository';
import { InstructionsService } from '../src/features/instructions/service';
import { createApiApp } from '../src/server/api';
import { openFoundryStorage } from '../src/storage/index';

const { join } = path;

it('stores each instruction as an atomic Markdown file with frontmatter', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-instructions-'));
  const storage = openFoundryStorage(directory);
  const service = new InstructionsService(storage);

  try {
    const created = service.create({
      name: 'Code review: checklist',
      content: '---\ntitle: body frontmatter\n---\n\n# Review\n\n- Check tests\n',
    });
    const directoryStat = await stat(join(directory, 'instructions'));
    const filename = `${created.id}.md`;
    const filePath = join(directory, 'instructions', filename);
    const fileStat = await stat(filePath);
    const markdown = await readFile(filePath, 'utf8');

    expect(directoryStat.mode & 0o777).toBe(0o700);
    expect(fileStat.mode & 0o777).toBe(0o600);
    expect(markdown).toMatch(/^---\n/u);
    expect(markdown).toContain(`createdAt: ${created.createdAt}`);
    expect(markdown).toContain(`updatedAt: ${created.updatedAt}`);
    expect(parseInstructionMarkdown(markdown, filename)).toEqual(created);
    expect(service.list()).toEqual([created]);
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it('rejects ISO timestamp strings in instruction frontmatter', () => {
  const id = '0a5fab1b-df3c-4721-8b0c-63ee87856292';
  const markdown = [
    '---',
    `id: ${id}`,
    'name: Legacy timestamp',
    'createdAt: 2026-11-27T17:50:02.798Z',
    'updatedAt: 2026-11-27T17:50:02.798Z',
    '---',
    '',
    '# Legacy',
    '',
  ].join('\n');

  expect(() => parseInstructionMarkdown(markdown, `${id}.md`))
    .toThrow('Invalid instruction file');
});

it('creates and lists instructions through the API with required fields', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-instructions-api-'));
  const storage = openFoundryStorage(directory);
  const app = createApiApp(storage);

  try {
    const response = await app.request('/api/instructions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: '  Review checklist  ',
        content: '# Review\n\nCheck the diff.',
      }),
    });
    expect(response.status).toBe(201);
    const created = await response.json() as {
      id: string;
      name: string;
      content: string;
    };
    expect(created).toMatchObject({
      name: 'Review checklist',
      content: '# Review\n\nCheck the diff.',
    });

    const listResponse = await app.request('/api/instructions');
    expect(listResponse.status).toBe(200);
    expect(await listResponse.json()).toEqual([created]);

    const invalidResponse = await app.request('/api/instructions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Missing content', content: ' '.repeat(3) }),
    });
    expect(invalidResponse.status).toBe(400);
    expect(await invalidResponse.json()).toEqual({
      error: {
        code: 'INVALID_INSTRUCTION_INPUT',
        message: 'content is required',
      },
    });
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it('gets and updates one instruction through the service and API', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-instructions-update-'));
  const storage = openFoundryStorage(directory);
  const service = new InstructionsService(storage);
  const app = createApiApp(storage);

  try {
    const created = service.create({
      name: 'Draft',
      content: '# Draft\n\nOld content.',
    });
    expect(service.get(created.id)).toEqual(created);

    const updated = service.update(created.id, {
      name: 'Final checklist',
      content: '# Final\n\nNew content.',
    });
    expect(updated).toMatchObject({
      id: created.id,
      name: 'Final checklist',
      content: '# Final\n\nNew content.',
      createdAt: created.createdAt,
    });
    expect(updated.updatedAt >= created.updatedAt).toBe(true);
    const markdown = await readFile(
      join(directory, 'instructions', `${created.id}.md`),
      'utf8',
    );
    expect(parseInstructionMarkdown(markdown, `${created.id}.md`)).toEqual(updated);

    const detailResponse = await app.request(`/api/instructions/${created.id}`);
    expect(detailResponse.status).toBe(200);
    expect(await detailResponse.json()).toEqual(updated);

    const updateResponse = await app.request(`/api/instructions/${created.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'API update',
        content: '## API update',
      }),
    });
    expect(updateResponse.status).toBe(200);
    expect(await updateResponse.json()).toMatchObject({
      id: created.id,
      name: 'API update',
      content: '## API update',
      createdAt: created.createdAt,
    });

    const missingResponse = await app.request('/api/instructions/not-an-id');
    expect(missingResponse.status).toBe(404);
    expect(await missingResponse.json()).toEqual({
      error: {
        code: 'INSTRUCTION_NOT_FOUND',
        message: 'Instruction not found: not-an-id',
      },
    });

    const invalidResponse = await app.request(
      `/api/instructions/${created.id}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: 'Missing content', content: ' ' }),
      },
    );
    expect(invalidResponse.status).toBe(400);
    expect(await invalidResponse.json()).toMatchObject({
      error: { code: 'INVALID_INSTRUCTION_INPUT' },
    });
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});

it('deletes unused instructions but refuses assigned instructions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foundry-instructions-delete-'));
  const storage = openFoundryStorage(directory);
  const service = new InstructionsService(storage);
  const agentsService = new AgentsService(storage, service, directory);
  const app = createApiApp(storage, {
    agentsService,
    instructionsService: service,
  });

  try {
    const unused = service.create({
      name: 'Unused',
      content: '# Unused',
    });
    const deletionResult = await app.request(
      `/api/instructions/${unused.id}`,
      { method: 'DELETE' },
    );
    expect(deletionResult.status).toBe(204);
    expect(service.list()).toEqual([]);
    await expect(
      stat(join(directory, 'instructions', `${unused.id}.md`)),
    ).rejects.toMatchObject({ code: 'ENOENT' });

    const missingResponse = await app.request(
      `/api/instructions/${unused.id}`,
      { method: 'DELETE' },
    );
    expect(missingResponse.status).toBe(404);
    expect(await missingResponse.json()).toEqual({
      error: {
        code: 'INSTRUCTION_NOT_FOUND',
        message: `Instruction not found: ${unused.id}`,
      },
    });

    const assigned = service.create({
      name: 'Assigned',
      content: '# Assigned',
    });
    const assignResponse = await app.request(
      '/api/agents/chatgpt/instructions',
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ instructionIds: [assigned.id] }),
      },
    );
    expect(assignResponse.status).toBe(200);

    const inUseResponse = await app.request(
      `/api/instructions/${assigned.id}`,
      { method: 'DELETE' },
    );
    expect(inUseResponse.status).toBe(409);
    expect(await inUseResponse.json()).toEqual({
      error: {
        code: 'INSTRUCTION_IN_USE',
        message: 'Instruction is assigned to: chatgpt',
      },
    });
    expect(service.get(assigned.id)).toEqual(assigned);
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
});
