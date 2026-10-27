import * as stylex from '@stylexjs/stylex';

export const styles = stylex.create({
  illustration: {
    paddingBlock: 'var(--spacing-1)',
  },
  satelliteNode: {
    width: 'var(--spacing-12)',
    height: 'var(--spacing-12)',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-background-card)',
    boxShadow: 'inset 0 0 0 var(--border-width) var(--color-border-emphasized)',
  },
  coreNode: {
    width: 'calc(var(--spacing-10) * 2)',
    height: 'calc(var(--spacing-10) * 2)',
    borderRadius: 'var(--radius-full)',
    backgroundColor: 'var(--color-accent-muted)',
    boxShadow: 'inset 0 0 0 var(--border-width) var(--color-border-emphasized)',
  },
  connector: {
    width: 'var(--spacing-8)',
    height: 'var(--border-width)',
    backgroundColor: 'var(--color-border-emphasized)',
  },
});
