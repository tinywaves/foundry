import * as stylex from '@stylexjs/stylex';

export const styles = stylex.create({
  titlebar: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-2)',
    height: 'calc(var(--spacing-4) * 2.5)',
    minHeight: 'calc(var(--spacing-4) * 2.5)',
    paddingInlineStart: 'calc(var(--spacing-4) * 6)',
    paddingInlineEnd: 'var(--spacing-4)',
    userSelect: 'none',
    WebkitAppRegion: 'drag',
  },
});

export const titlebarStyle = stylex.props(styles.titlebar);
