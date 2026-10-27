import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  commonWebkitAppRegionNoDrag: {
    WebkitAppRegion: 'no-drag',
  },
});

export const commonWebkitAppRegionNoDrag = stylex.props(styles.commonWebkitAppRegionNoDrag);
