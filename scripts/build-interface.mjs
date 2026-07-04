import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const interfaceRoot = path.join(repoRoot, 'src/interface');
const outDir = path.join(repoRoot, 'dist/interface');
const source = path.join(interfaceRoot, 'index.html');
const target = path.join(outDir, 'index.html');

await mkdir(outDir, { recursive: true });
await copyFile(source, target);
