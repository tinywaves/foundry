import * as stylex from '@stylexjs/stylex';

export const styles = stylex.create({
  appShell: {
    fontFamily: 'Poppins, sans-serif',
  },
  sideNav: { width: 'calc(var(--spacing-4) * 12.5) !important' },
  sideNavCollapsed: { width: 'var(--spacing-12) !important' },
  contentNoVerticalPadding: {
    paddingBlockStart: 'calc(var(--spacing-4) * 2.5)',
    paddingBlockEnd: 0,
  },
  compactNavItems: {
    rowGap: 'calc(var(--spacing-0-5) / 2)',
  },
});
