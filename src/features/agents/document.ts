export const INSTRUCTION_BLOCK_START = '<!-- foundry:instructions:start -->';
export const INSTRUCTION_BLOCK_END = '<!-- foundry:instructions:end -->';

type Marker = 'end' | 'start' | 'other';

export function renderInstructionDocument(
  existing: string,
  contents: string[],
): string {
  const cleaned = removeInstructionBlocks(existing);
  const block = renderInstructionBlock(contents);
  const separator = getBlockSeparator(cleaned);

  return `${cleaned}${separator}${block}\n`;
}

export function removeInstructionBlocks(existing: string): string {
  let result = '';
  let depth = 0;

  for (const line of splitLines(existing)) {
    const marker = readMarker(line);
    if (marker === 'start') {
      depth += 1;
      continue;
    }
    if (marker === 'end') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (marker === 'other' || depth > 0) {
      continue;
    }
    result += line;
  }

  return result;
}

function getBlockSeparator(cleaned: string): string {
  return !cleaned || cleaned.endsWith('\n') ? '' : '\n';
}

function renderInstructionBlock(contents: string[]): string {
  const body = contents
    .map((content) => content.trimEnd())
    .filter(Boolean)
    .join('\n\n');

  return body
    ? `${INSTRUCTION_BLOCK_START}\n\n${body}\n\n${INSTRUCTION_BLOCK_END}`
    : `${INSTRUCTION_BLOCK_START}\n${INSTRUCTION_BLOCK_END}`;
}

function splitLines(source: string): string[] {
  return source.match(/[^\n]*\n|[^\n]+$/gu) ?? [];
}

function readMarker(line: string): Marker | null {
  const value = line.replace(/\r?\n$/u, '').trim();
  if (!(/^<!--\s*foundry\b/iu).test(value)) {
    return null;
  }
  if ((/\bstart\b/iu).test(value)) {
    return 'start';
  }
  if ((/\bend\b/iu).test(value)) {
    return 'end';
  }
  return 'other';
}
