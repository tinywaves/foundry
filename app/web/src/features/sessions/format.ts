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

export function formatDirectoryParent(directory: string): string {
  const normalized = directory.replaceAll('\\', '/').replace(/\/+$/u, '');
  if ((/^(?:\/(?:Users|home)|[A-Z]:\/Users)\/[^/]+$/iu).test(normalized)) {
    return '~';
  }
  const separator = normalized.lastIndexOf('/');
  if (separator === -1) {
    return '';
  }
  const parent = normalized.slice(0, separator) || '/';
  return parent.replace(/^(?:\/(?:Users|home)|[A-Z]:\/Users)\/[^/]+(?=\/|$)/iu, '~');
}

export function formatRelativeTime(value: string, locale: string, now = Date.now()): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return '';
  }
  const seconds = (timestamp - now) / 1000;
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 365 * 24 * 60 * 60],
    ['month', 30 * 24 * 60 * 60],
    ['day', 24 * 60 * 60],
    ['hour', 60 * 60],
    ['minute', 60],
  ];
  for (const [unit, duration] of units) {
    if (Math.abs(seconds) >= duration) {
      return formatter.format(Math.trunc(seconds / duration), unit);
    }
  }
  return formatter.format(0, 'second');
}

function formatScaled(value: number, suffix: string): string {
  return `${value >= 100 ? Math.round(value) : value.toFixed(1).replace(/\.0$/u, '')}${suffix}`;
}
