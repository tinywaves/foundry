import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';

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
    expect(parseInstructionMarkdown(markdown, filename)).toEqual(created);
    expect(service.list()).toEqual([created]);
  } finally {
    storage.close();
    await rm(directory, { recursive: true, force: true });
  }
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
