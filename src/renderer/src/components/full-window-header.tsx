import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { LayoutHeader } from '@astryxdesign/core/Layout';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import * as stylex from '@stylexjs/stylex';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { WindowDragRegion } from './window-drag-region';

const styles = stylex.create({
  content: {
    boxSizing: 'border-box',
  },
});

export interface FullWindowHeaderProps {
  action?: ReactNode;
  backLabel?: string;
  isBackDisabled?: boolean;
  onBack: () => void;
  primaryAction?: ReactNode;
  title: string;
}

export function FullWindowHeader({
  action,
  backLabel = 'Back',
  isBackDisabled = false,
  onBack,
  primaryAction,
  title,
}: FullWindowHeaderProps) {
  const isMacOS = globalThis.api.platform === 'darwin';

  return (
    <LayoutHeader padding={0}>
      <VStack width="100%">
        <WindowDragRegion
          isDraggable={isMacOS}
          variant="header"
        >
          <HStack
            width="100%"
            height="100%"
            paddingInline={3}
            hAlign="center"
            vAlign="center"
            xstyle={styles.content}
          >
            <Heading
              level={4}
              accessibilityLevel={1}
              maxLines={1}
              justify="center"
              textWrap="nowrap"
            >
              {title}
            </Heading>
          </HStack>
        </WindowDragRegion>
        <HStack
          width="100%"
          gap={2}
          padding={4}
          paddingBlock={2}
          hAlign="start"
          vAlign="center"
          xstyle={styles.content}
        >
          <Button
            label={backLabel}
            type="button"
            size="sm"
            variant="ghost"
            icon={<Icon icon={ArrowLeft} size="sm" color="inherit" />}
            isDisabled={isBackDisabled}
            onClick={onBack}
          />
          {action || primaryAction ? <StackItem size="fill" /> : null}
          {action}
          {primaryAction}
        </HStack>
      </VStack>
    </LayoutHeader>
  );
}
