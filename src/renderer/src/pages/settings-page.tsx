import { Button } from '@astryxdesign/core/Button';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import {
  Layout,
  LayoutPanel,
} from '@astryxdesign/core/Layout';
import { List, ListItem } from '@astryxdesign/core/List';
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@astryxdesign/core/SegmentedControl';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden';
import { ArrowLeft, SunMoon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import type { ApplicationColorMode } from '../../../shared/settings-contract';
import { applicationColorModes } from '../../../shared/settings-contract';
import { useApplicationSettings } from '@renderer/application-settings-context';
import { WindowDragRegion } from '@renderer/components/window-drag-region';
import { getSettingsBackNavigation } from '@renderer/settings-navigation';

const colorModeLabels = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
} satisfies Record<ApplicationColorMode, string>;

function isApplicationColorMode(value: string): value is ApplicationColorMode {
  return applicationColorModes.includes(value as ApplicationColorMode);
}

export function SettingsPage() {
  const isMacOS = globalThis.api.platform === 'darwin';
  const { colorMode, updateColorMode } = useApplicationSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const backNavigation = getSettingsBackNavigation(location.state);
  const returnFromSettings = () => {
    if (backNavigation.kind === 'history') {
      void navigate(-1);
      return;
    }
    void navigate(backNavigation.path, backNavigation.options);
  };

  return (
    <Layout
      height="fill"
      start={(
        <LayoutPanel
          width={260}
          padding={0}
          hasDivider
          role="navigation"
          label="Settings sections"
        >
          <VStack width="100%" height="100%">
            <WindowDragRegion isDraggable={isMacOS} />
            <VStack
              width="100%"
              gap={6}
              padding={4}
              paddingBlock={8}
            >
              <HStack width="100%" hAlign="start">
                <Button
                  label="Back"
                  type="button"
                  variant="ghost"
                  icon={<Icon icon={ArrowLeft} size="sm" color="inherit" />}
                  onClick={returnFromSettings}
                />
              </HStack>
              <List
                density="balanced"
                header={<VisuallyHidden>Settings sections</VisuallyHidden>}
              >
                <ListItem
                  label="Appearance"
                  startContent={<Icon icon={SunMoon} size="sm" color="secondary" />}
                  isSelected
                />
              </List>
            </VStack>
          </VStack>
        </LayoutPanel>
      )}
      content={(
        <VStack width="100%" height="100%">
          <WindowDragRegion isDraggable={isMacOS} />
          <StackItem size="fill" isScrollable>
            <HStack
              width="100%"
              padding={8}
              hAlign="center"
              vAlign="start"
            >
              <VisuallyHidden as="h1">Appearance</VisuallyHidden>
              <Grid
                columns={{ minWidth: 240, max: 2, repeat: 'fit' }}
                columnGap={8}
                rowGap={4}
                width="100%"
                maxWidth={960}
                align="center"
              >
                <Text type="label">Theme</Text>
                <SegmentedControl
                  value={colorMode}
                  label="Theme"
                  layout="fill"
                  onChange={(value) => {
                    if (isApplicationColorMode(value)) {
                      updateColorMode(value);
                    }
                  }}
                >
                  {applicationColorModes.map((mode) => (
                    <SegmentedControlItem
                      key={mode}
                      value={mode}
                      label={colorModeLabels[mode]}
                    />
                  ))}
                </SegmentedControl>
              </Grid>
            </HStack>
          </StackItem>
        </VStack>
      )}
    />
  );
}
