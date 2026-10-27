import * as stylex from '@stylexjs/stylex';

export const preview = stylex.create({
  bar: {
    height: 4,
    width: '50%',
    borderRadius: 999,
    backgroundColor: 'var(--color-border-emphasized)',
  },
  barWide: { width: '66%' },
  mutedSurface: { backgroundColor: 'var(--color-background-muted)' },
  contentSurface: { backgroundColor: 'var(--color-background-surface)' },
  clip: { overflow: 'hidden', borderRadius: 'var(--radius-element)' },
  inert: { pointerEvents: 'none' },
});
