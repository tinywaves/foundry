import { spacingVars } from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import type { ProviderRuntime } from '../../../../shared/provider-contract';
import { providerRuntimeIconUrls } from './provider-runtime';

const providerRuntimeIconDimensions = {
  md: 24,
  sm: 16,
} as const;

const styles = stylex.create({
  icon: {
    display: 'block',
    flexShrink: 0,
  },
  md: {
    width: spacingVars['--spacing-6'],
    height: spacingVars['--spacing-6'],
  },
  sm: {
    width: spacingVars['--spacing-4'],
    height: spacingVars['--spacing-4'],
  },
});

export function ProviderRuntimeIcon({
  runtime,
  size = 'sm',
}: {
  runtime: ProviderRuntime;
  size?: keyof typeof providerRuntimeIconDimensions;
}) {
  const dimension = providerRuntimeIconDimensions[size];
  return (
    <img
      {...stylex.props(styles.icon, styles[size])}
      src={providerRuntimeIconUrls[runtime]}
      alt=""
      width={dimension}
      height={dimension}
      draggable={false}
    />
  );
}
