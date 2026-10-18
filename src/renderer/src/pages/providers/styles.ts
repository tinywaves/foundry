import * as stylex from '@stylexjs/stylex';

export const styles = stylex.create({
  providerList: {
    gap: 'var(--spacing-2)',
  },
  providerItem: {
    borderWidth: 'var(--border-width)',
    borderStyle: 'solid',
    borderColor: 'var(--color-border-emphasized)',
    borderRadius: 'var(--radius-container)',
    backgroundColor: 'var(--color-background-surface)',
  },
  providerDescription: {
    minWidth: 0,
  },
  providerBaseURL: {
    maxWidth: 'min(34rem, 42vw)',
  },
  providerActions: {
    flexShrink: 0,
  },
  providerPopover: {
    boxShadow: 'inset 0 0 0 var(--border-width) var(--color-border-emphasized), var(--shadow-med)',
  },
});
