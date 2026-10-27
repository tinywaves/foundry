import * as stylex from '@stylexjs/stylex';

export const ROW_PADDING = 4;
export const CONTROL_WIDTH = 260;
const ROW_STACK = '@container settings-panel (max-width: 480px)';

export const row = stylex.create({
  panel: { containerType: 'inline-size', containerName: 'settings-panel' },
  line: {
    display: 'flex',
    flexDirection: { default: 'row', [ROW_STACK]: 'column' },
    alignItems: { default: 'center', [ROW_STACK]: 'stretch' },
    gap: { default: 'var(--spacing-3)', [ROW_STACK]: 'var(--spacing-2)' },
  },
  textColumn: { maxWidth: { default: 420, [ROW_STACK]: 'none' } },
  control: { flexShrink: 0 },
});
