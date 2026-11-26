import { createReadStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';
import { pipeline } from 'node:stream/promises';
// Node 24 provides streaming Zstandard support for Codex transcripts.
// eslint-disable-next-line n/no-unsupported-features/node-builtins
import { createZstdDecompress } from 'node:zlib';

// Larger chunks reduce stream overhead and repeated copying of long JSONL records.
const TRANSCRIPT_CHUNK_BYTES = 1024 * 1024;

export interface TranscriptFiles {
  files: string[];
  unreadable: number;
  found: boolean;
}

export async function findTranscriptFiles(root: string): Promise<TranscriptFiles> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch (error) {
    const isMissing = error instanceof Error && 'code' in error && error.code === 'ENOENT';
    return { files: [], unreadable: isMissing ? 0 : 1, found: !isMissing };
  }
  const result: TranscriptFiles = { files: [], unreadable: 0, found: true };
  for (const entry of entries) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) {
      const nested = await findTranscriptFiles(file);
      result.files.push(...nested.files);
      result.unreadable += nested.unreadable;
    } else if (entry.isFile() && (/\.jsonl(?:\.zst)?$/u).test(entry.name)) {
      result.files.push(file);
    }
  }
  // A compressed sibling is another representation of the same segment.
  const paths = new Set(result.files);
  result.files = result.files.filter((file) => !file.endsWith('.zst') || !paths.has(file.slice(0, -4))).toSorted((left, right) => left.localeCompare(right));
  return result;
}

export async function readTranscript(
  file: string,
  visit: (record: Record<string, unknown>) => void,
): Promise<{ hasMalformedLines: boolean }> {
  let hasMalformedLines = false;
  const line = (text: string) => {
    if (!text.trim()) {
      return;
    }
    let record: unknown;
    try {
      record = JSON.parse(text);
    } catch {
      hasMalformedLines = true;
      return;
    }
    if (isRecord(record)) {
      visit(record);
    } else {
      hasMalformedLines = true;
    }
  };
  const consume = async (source: AsyncIterable<Uint8Array>) => {
    const decoder = new StringDecoder('utf8');
    let carry = '';
    for await (const chunk of source) {
      carry += decoder.write(chunk);
      let start = 0;
      let end = carry.indexOf('\n', start);
      while (end !== -1) {
        line(carry.slice(start, end));
        start = end + 1;
        end = carry.indexOf('\n', start);
      }
      carry = carry.slice(start);
    }
    carry += decoder.end();
    line(carry);
  };
  if (file.endsWith('.zst')) {
    await pipeline(
      createReadStream(file, { highWaterMark: TRANSCRIPT_CHUNK_BYTES }),
      createZstdDecompress({ chunkSize: TRANSCRIPT_CHUNK_BYTES }),
      consume,
    );
  } else {
    await pipeline(createReadStream(file, { highWaterMark: TRANSCRIPT_CHUNK_BYTES }), consume);
  }
  return { hasMalformedLines };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function timestamp(value: unknown): number | null {
  const result = Date.parse(text(value));
  return Number.isFinite(result) ? result : null;
}

export function nonnegative(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function contentText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  return Array.isArray(value)
    ? value.filter(isRecord)
        .filter((part) => ['text', 'input_text', 'output_text'].includes(text(part.type)))
        .map((part) => text(part.text))
        .join('\n')
    : '';
}

export function threadTitle(value: string, id: string): string {
  return value.replaceAll(/\s+/gu, ' ').trim().slice(0, 240) || id.slice(0, 8);
}
