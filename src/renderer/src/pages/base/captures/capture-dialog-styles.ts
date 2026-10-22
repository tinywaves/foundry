import * as stylex from '@stylexjs/stylex';

const enterPulse = stylex.keyframes({
  '0%, 100%': {
    opacity: 1,
    transform: 'scale(1)',
  },
  '50%': {
    opacity: 0.65,
    transform: 'scale(1.08)',
  },
});

export const styles = stylex.create({
  dropZone: {
    'minHeight': 'calc(var(--spacing-10) * 3)',
    'borderStyle': 'dashed',
    'borderWidth': 'var(--border-width)',
    'borderColor': 'var(--color-border-emphasized)',
    'backgroundColor': 'var(--color-background-muted)',
    'cursor': 'text',
    'outline': 'none',
    ':focus-visible': {
      outline: 'var(--border-width) solid var(--color-accent)',
      outlineOffset: 'var(--spacing-0-5)',
    },
  },
  content: {
    minHeight: 'calc(var(--spacing-10) * 2)',
  },
  urlLink: {
    justifyContent: 'center',
    width: '100%',
    textAlign: 'center',
  },
  enterKey: {
    animationName: enterPulse,
    animationDuration: '1.4s',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
  },
});
