import { useMatches, useNavigate } from 'react-router-dom';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { SideNavCollapseButton } from '@astryxdesign/core/SideNav';
import type { SideNavCollapseButtonProps } from '@astryxdesign/core/SideNav';
import { HStack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { commonWebkitAppRegionNoDrag } from '../../styles/common';
import { styles, titlebarStyle } from './styles';
import { useI18n } from '@renderer/i18n/use-i18n';

function isRouteHandle(value: unknown): value is { title?: string; description?: string } {
  return typeof value === 'object'
    && value !== null
    && 'title' in value
    && typeof value.title === 'string';
}

type WindowTitlebarProps = Partial<Pick<SideNavCollapseButtonProps, 'collapsible'>> & {
  showBackButton?: boolean;
};

export default function WindowTitlebar({ collapsible, showBackButton = false }: WindowTitlebarProps) {
  const matches = useMatches();
  const navigate = useNavigate();
  const { t } = useI18n();
  const titleHandle = matches.findLast((match) => isRouteHandle(match.handle))?.handle;
  const titleTranslations: Record<string, string> = {
    'Overview': t('navigation.overview'),
    'Base': t('navigation.base'),
    'Jobs': t('navigation.jobs'),
    'Prompts': t('navigation.prompts'),
    'Providers': t('navigation.providers'),
    'Settings': t('navigation.settings'),
    'New provider': t('navigation.newProvider'),
    'Edit provider': t('navigation.editProvider'),
    'Page not found': t('navigation.notFound'),
  };
  const descriptionTranslations: Record<string, string> = {
    'Manage the model service connections used by Foundry.': t('navigation.providersDescription'),
    'Collect links first, then organize them later.': t('navigation.baseDescription'),
    'Review scrape history and errors for this capture.': t('navigation.jobsDescription'),
    'Connect a model service using one of Foundry\'s supported protocols.': t('providers.formDescription'),
  };

  return (
    <header
      {...titlebarStyle}
      onDoubleClick={() => globalThis.electron.ipcRenderer.invoke('window:toggle-maximize')}
      aria-label={t('navigation.windowTitlebar')}
    >
      {showBackButton && (
        <IconButton
          {...commonWebkitAppRegionNoDrag}
          label={t('navigation.back')}
          icon={<Icon icon="chevronLeft" />}
          variant="ghost"
          size="sm"
          tooltip={t('navigation.back')}
          onClick={() => navigate(-1)}
          onDoubleClick={(event) => event.stopPropagation()}
        />
      )}
      {collapsible && (
        <SideNavCollapseButton
          {...commonWebkitAppRegionNoDrag}
          collapsible={collapsible}
          size="sm"
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <Icon icon={collapsible.isCollapsed ? 'chevronsRight' : 'chevronsLeft'} size="sm" />
        </SideNavCollapseButton>
      )}
      {isRouteHandle(titleHandle) && (
        <HStack gap={2} vAlign="center" width="100%" xstyle={styles.content}>
          <Text type="large" weight="semibold" maxLines={1} textWrap="nowrap" xstyle={styles.title}>
            {titleHandle.title && (titleTranslations[titleHandle.title] ?? titleHandle.title)}
          </Text>
          {titleHandle.description && (
            <Text type="supporting" maxLines={1} textWrap="nowrap" xstyle={styles.description}>
              {descriptionTranslations[titleHandle.description] ?? titleHandle.description}
            </Text>
          )}
          <StackItem size="fill" />
          <HStack
            {...commonWebkitAppRegionNoDrag}
            id="window-titlebar-actions"
            vAlign="center"
            xstyle={styles.actions}
          />
        </HStack>
      )}
    </header>
  );
}
