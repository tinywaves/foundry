import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  titlebar: {
    display: 'flex',
    alignItems: 'center',
    height: 'calc(var(--spacing-4) * 2.5)',
    minHeight: 'calc(var(--spacing-4) * 2.5)',
    paddingInlineStart: 'calc(var(--spacing-4) * 6)',
    userSelect: 'none',
    WebkitAppRegion: 'drag',
  },
  titlebarCollapseButton: {
    WebkitAppRegion: 'no-drag',
  },
});

export const titlebarStyle = stylex.props(styles.titlebar);
export const titlebarCollapseButtonStyle = stylex.props(styles.titlebarCollapseButton);
