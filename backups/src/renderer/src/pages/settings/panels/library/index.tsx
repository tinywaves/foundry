import { VStack } from '@astryxdesign/core/VStack';
import type { PanelProps } from '../../types';
import { CapturesSettingsBlock } from './captures';

export function LibraryPanel(props: PanelProps) {
  return (
    <VStack gap={4}>
      <CapturesSettingsBlock {...props} />
    </VStack>
  );
}
