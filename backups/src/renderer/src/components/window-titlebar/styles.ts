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
  content: {
    minWidth: 0,
  },
  title: {
    'flex': '0 1 auto',
    'minWidth': 0,
    'maxWidth': '35%',
    '@media (max-width: 840px)': {
      maxWidth: '30%',
    },
  },
  description: {
    'minWidth': 0,
    'flexShrink': 1,
    '@media (max-width: 840px)': {
      display: 'none',
    },
  },
  actions: {
    flexShrink: 0,
  },
});

export const titlebarStyle = stylex.props(styles.titlebar);
