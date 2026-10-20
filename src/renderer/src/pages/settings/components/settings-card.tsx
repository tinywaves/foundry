import { isValidElement } from 'react';
import type { ReactNode } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';

export function SettingsCard({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  const rows = Array.isArray(children) ? children : [children];

  return (
    <VStack gap={1.5}>
      {title != null && (
        <Text type="supporting" weight="semibold" color="secondary">
          {title}
        </Text>
      )}
      <Card padding={0} width="100%" variant="muted">
        <VStack as="ul" role="list" gap={0}>
          {rows.map((row, index) => {
            const isNotFirstRow = index > 0;
            return (
              <VStack key={isValidElement(row) ? row.key : 'settings-row'} as="li" gap={0}>
                {isNotFirstRow && <Divider variant="subtle" />}
                <VStack>{row}</VStack>
              </VStack>
            );
          })}
        </VStack>
      </Card>
    </VStack>
  );
}
