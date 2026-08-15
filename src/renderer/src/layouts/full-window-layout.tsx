import { StackItem, VStack } from '@astryxdesign/core/Stack';
import * as stylex from '@stylexjs/stylex';
import { Outlet } from 'react-router';
import { WindowDragRegion } from '@renderer/components/window-drag-region';

const styles = stylex.create({
  main: {
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
  },
});

export function FullWindowLayout() {
  const isMacOS = globalThis.api.platform === 'darwin';

  return (
    <VStack width="100%" height="100%">
      {isMacOS ? <WindowDragRegion /> : null}
      <StackItem
        as="main"
        size="fill"
        xstyle={styles.main}
      >
        <Outlet />
      </StackItem>
    </VStack>
  );
}
