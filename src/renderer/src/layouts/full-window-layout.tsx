import { StackItem, VStack } from '@astryxdesign/core/Stack';
import * as stylex from '@stylexjs/stylex';
import { Outlet } from 'react-router';

const styles = stylex.create({
  main: {
    minWidth: 0,
    minHeight: 0,
    overflow: 'hidden',
  },
});

export function FullWindowLayout() {
  return (
    <VStack width="100%" height="100dvh">
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
