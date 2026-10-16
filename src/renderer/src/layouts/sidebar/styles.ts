import * as stylex from '@stylexjs/stylex';

export const styles = stylex.create({
  appShell: {
    fontFamily: 'Poppins, sans-serif',
  },
  sideNav: {
    width: 'calc(var(--spacing-4) * 12.5)',
  },
  sideNavCollapsed: {
    width: 'var(--spacing-12)',
  },
  contentNoVerticalPadding: {
    paddingBlock: 0,
  },
});
