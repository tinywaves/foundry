import { AppShell } from '@astryxdesign/core/AppShell';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import {
  MetadataList,
  MetadataListItem,
} from '@astryxdesign/core/MetadataList';
import { Section } from '@astryxdesign/core/Section';
import { SelectableCard } from '@astryxdesign/core/SelectableCard';
import { SideNav, SideNavItem } from '@astryxdesign/core/SideNav';
import { HStack, StackItem, VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import {
  fontWeightVars,
  spacingVars,
} from '@astryxdesign/core/theme/tokens.stylex';
import * as stylex from '@stylexjs/stylex';
import {
  ArrowLeft,
  Info,
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
import foundryIcon from '../../../../resources/icon.png?url';

const foundryContactEmail = 'dhzhme@gmail.com';
const foundryEmailUrl = `mailto:${foundryContactEmail}`;
const foundryRepositoryUrl = 'https://github.com/tinywaves/foundry';
const foundryReleasesUrl = 'https://github.com/tinywaves/foundry/releases';

const styles = stylex.create({
  backButton: {
    fontWeight: fontWeightVars['--font-weight-normal'],
  },
  productIcon: {
    display: 'block',
    flexShrink: 0,
    width: spacingVars['--spacing-12'],
    height: spacingVars['--spacing-12'],
    objectFit: 'contain',
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

type SettingsSection = 'about' | 'appearance';

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

function AboutSettings() {
  return (
    <VStack width="100%" gap={6}>
      <Heading level={1}>About</Heading>
      <Divider />
      <VStack width="100%" gap={6}>
        <HStack width="100%" gap={4} vAlign="center">
          <img
            {...stylex.props(styles.productIcon)}
            src={foundryIcon}
            alt=""
            width={1024}
            height={1024}
            draggable={false}
          />
          <StackItem size="fill">
            <VStack width="100%" gap={1}>
              <Heading level={2}>Foundry</Heading>
              <Text color="secondary" textWrap="pretty">
                An AI-native local developer runtime for tools, skills, agents,
                and workflows.
              </Text>
            </VStack>
          </StackItem>
        </HStack>
        <MetadataList label={{ position: 'top' }}>
          <MetadataListItem label="Version">
            <Text>{globalThis.api.applicationVersion}</Text>
          </MetadataListItem>
          <MetadataListItem label="Author">
            <Text>tinywaves</Text>
          </MetadataListItem>
          <MetadataListItem label="Email">
            <Link
              as="a"
              href={foundryEmailUrl}
              isExternalLink
              isStandalone
            >
              {foundryContactEmail}
            </Link>
          </MetadataListItem>
          <MetadataListItem label="License">
            <Text>Apache-2.0</Text>
          </MetadataListItem>
        </MetadataList>
        <VStack width="100%" gap={2}>
          <Heading level={2}>Project Links</Heading>
          <VStack width="100%" gap={2}>
            <Link
              as="a"
              href={foundryRepositoryUrl}
              isExternalLink
              isStandalone
            >
              GitHub Repository
            </Link>
            <Link
              as="a"
              href={foundryReleasesUrl}
              isExternalLink
              isStandalone
            >
              Releases
            </Link>
          </VStack>
        </VStack>
      </VStack>
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
                  label="About"
                  icon={Info}
                  isSelected={activeSection === 'about'}
                  onClick={() => setActiveSection('about')}
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
              {activeSection === 'about' && <AboutSettings />}
            </Section>
          </HStack>
        </StackItem>
      </VStack>
    </AppShell>
  );
}
