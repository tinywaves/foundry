export type PromptContentLineSeparator = '\n' | '\r' | '\r\n';

export function getPromptContentLineSeparator(
  value: string,
): PromptContentLineSeparator | undefined {
  const hasCrlf = value.includes('\r\n');
  const valueWithoutCrlf = value.replaceAll('\r\n', '');
  const hasLf = valueWithoutCrlf.includes('\n');
  const hasCr = valueWithoutCrlf.includes('\r');
  const separatorCount = Number(hasCrlf) + Number(hasLf) + Number(hasCr);

  if (separatorCount > 1) {
    return undefined;
  }
  if (hasCrlf) {
    return '\r\n';
  }
  if (hasCr) {
    return '\r';
  }
  return '\n';
}
