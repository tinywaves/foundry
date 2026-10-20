import type { ReactNode } from 'react';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { Stack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import type { IconComponent } from '../types';

import { ROW_PADDING, row } from './settings-row-styles';

export function SettingsRow({
  title,
  titleAccessory,
  description,
  icon,
  control,
  detail,
}: {
  title: string;
  titleAccessory?: ReactNode;
  description?: ReactNode;
  icon: IconComponent;
  control?: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <VStack padding={ROW_PADDING} gap={2}>
      <Stack xstyle={row.line} data-settings-line>
        <StackItem size="fill">
          <HStack gap={2} align="start">
            <VStack paddingBlockStart={0.5}>
              <Icon icon={icon} size="sm" color="secondary" />
            </VStack>
            <VStack gap={0.5} xstyle={row.textColumn}>
              {titleAccessory == null
                ? (
                    <Text type="label">{title}</Text>
                  )
                : (
                    <HStack gap={1.5} align="center">
                      <Text type="label">{title}</Text>
                      {titleAccessory}
                    </HStack>
                  )}
              {description != null && (
                <Text type="supporting" color="secondary">
                  {description}
                </Text>
              )}
            </VStack>
          </HStack>
        </StackItem>
        {control != null && (
          <VStack data-settings-control xstyle={row.control}>
            {control}
          </VStack>
        )}
      </Stack>
      {detail}
    </VStack>
  );
}
