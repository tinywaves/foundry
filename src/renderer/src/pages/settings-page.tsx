import { AppShell } from '@astryxdesign/core/AppShell';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { Section } from '@astryxdesign/core/Section';
import { SelectableCard } from '@astryxdesign/core/SelectableCard';
import { SideNav, SideNavItem } from '@astryxdesign/core/SideNav';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { fontWeightVars } from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import {
  ArrowLeft,
  Database,
  Monitor,
  Moon,
  Sun,
  SunMoon,
} from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { ApplicationColorMode } from '../../../shared/settings-contract';
import { applicationColorModes } from '../../../shared/settings-contract';
import { useApplicationSettings } from '@renderer/application-settings-context';
import { WindowDragRegion } from '@renderer/components/window-drag-region';
import {
  applicationSidebarResizeConfig,
  applicationSidebarStyles,
} from '@renderer/layouts/application-sidebar';
import { getSettingsBackNavigation } from '@renderer/settings-navigation';

const styles = stylex.create({
  backButton: {
    fontWeight: fontWeightVars['--font-weight-normal'],
  },
});

const colorModeLabels = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
} satisfies Record<ApplicationColorMode, string>;

const colorModePresentation = {
  light: {
    description: 'Use a light appearance.',
    icon: Sun,
  },
  dark: {
    description: 'Use a dark appearance.',
    icon: Moon,
  },
  system: {
    description: 'Match the system appearance.',
    icon: Monitor,
  },
} satisfies Record<ApplicationColorMode, {
  description: string;
  icon: typeof Sun;
}>;

type SettingsSection = 'appearance' | 'data';

interface AppearanceSettingsProps {
  colorMode: ApplicationColorMode;
  onColorModeChange: (colorMode: ApplicationColorMode) => void;
}

function AppearanceSettings({
  colorMode,
  onColorModeChange,
}: AppearanceSettingsProps) {
  return (
    <VStack width="100%" gap={6}>
      <Heading level={1}>Appearance</Heading>
      <Divider />
      <VStack width="100%" gap={3}>
        <Text type="label">Theme</Text>
        <Grid
          columns={{ minWidth: 200, max: 3, repeat: 'fit' }}
          gap={4}
          width="100%"
        >
          {applicationColorModes.map((mode) => {
            const presentation = colorModePresentation[mode];
            return (
              <SelectableCard
                key={mode}
                label={`${colorModeLabels[mode]} theme`}
                isSelected={colorMode === mode}
                width="100%"
                height="100%"
                onChange={(isSelected) => {
                  if (isSelected) {
                    onColorModeChange(mode);
                  }
                }}
              >
                <VStack width="100%" gap={3}>
                  <Icon
                    icon={presentation.icon}
                    size="md"
                    color="secondary"
                  />
                  <VStack width="100%" gap={1}>
                    <Text type="label">{colorModeLabels[mode]}</Text>
                    <Text type="supporting" color="secondary">
                      {presentation.description}
                    </Text>
                  </VStack>
                </VStack>
              </SelectableCard>
            );
          })}
        </Grid>
      </VStack>
    </VStack>
  );
}

function DataSettings() {
  return (
    <VStack width="100%" gap={6}>
      <Heading level={1}>Data</Heading>
      <Divider />
      <Text>Hello world</Text>
    </VStack>
  );
}

export function SettingsPage() {
  const isMacOS = globalThis.api.platform === 'darwin';
  const { colorMode, updateColorMode } = useApplicationSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<SettingsSection>('appearance');
  const backNavigation = getSettingsBackNavigation(location.state);
  const returnFromSettings = () => {
    if (backNavigation.kind === 'history') {
      void navigate(-1);
      return;
    }
    void navigate(backNavigation.path, backNavigation.options);
  };
  return (
    <AppShell
      height="fill"
      variant="section"
      contentPadding={0}
      mobileNav={{ breakpoint: 'none', hasToggle: false }}
      sideNav={(
        <VStack height="100%" xstyle={applicationSidebarStyles.root}>
          {isMacOS ? <WindowDragRegion /> : null}
          <StackItem size="fill">
            <SideNav
              collapsible={false}
              resizable={applicationSidebarResizeConfig}
              header={(
                <Button
                  label="Back to app"
                  type="button"
                  size="sm"
                  variant="ghost"
                  width="fit-content"
                  icon={<Icon icon={ArrowLeft} size="sm" color="inherit" />}
                  xstyle={styles.backButton}
                  onClick={returnFromSettings}
                />
              )}
            >
              <VStack gap={1}>
                <SideNavItem
                  label="Appearance"
                  icon={SunMoon}
                  isSelected={activeSection === 'appearance'}
                  onClick={() => setActiveSection('appearance')}
                />
                <SideNavItem
                  label="Data"
                  icon={Database}
                  isSelected={activeSection === 'data'}
                  onClick={() => setActiveSection('data')}
                />
              </VStack>
            </SideNav>
          </StackItem>
        </VStack>
      )}
    >
      <VStack width="100%" height="100%">
        <WindowDragRegion isDraggable={isMacOS} />
        <StackItem size="fill" isScrollable>
          <HStack
            width="100%"
            paddingInline={8}
            paddingBlock={6}
            hAlign="center"
            vAlign="start"
          >
            <Section
              variant="transparent"
              padding={0}
              width="100%"
              maxWidth={960}
            >
              {activeSection === 'appearance' && (
                <AppearanceSettings
                  colorMode={colorMode}
                  onColorModeChange={updateColorMode}
                />
              )}
              {activeSection === 'data' && <DataSettings />}
            </Section>
          </HStack>
        </StackItem>
      </VStack>
    </AppShell>
  );
}
