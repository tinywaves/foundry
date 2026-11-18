export function formatBytes(value: unknown): string {
  const bytes = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  if (bytes <= 0) {
    return '—';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  if (unitIndex === 0) {
    return `${Math.round(size)} ${units[unitIndex]}`;
  }
  return `${size >= 100 ? Math.round(size) : size.toFixed(1).replace(/\.0$/u, '')} ${units[unitIndex]}`;
}

export function formatTokens(value: unknown): string {
  const tokens = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  if (tokens <= 0) {
    return '—';
  }
  if (tokens < 1000) {
    return Math.round(tokens).toString();
  }
  if (tokens < 1_000_000) {
    return formatScaled(tokens / 1000, 'K');
  }
  if (tokens < 1_000_000_000) {
    return formatScaled(tokens / 1_000_000, 'M');
  }
  return formatScaled(tokens / 1_000_000_000, 'B');
}

function formatScaled(value: number, suffix: string): string {
  return `${value >= 100 ? Math.round(value) : value.toFixed(1).replace(/\.0$/u, '')}${suffix}`;
}
