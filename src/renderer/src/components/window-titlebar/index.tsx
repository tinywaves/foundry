import { useMatches, useNavigate } from 'react-router-dom';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { SideNavCollapseButton } from '@astryxdesign/core/SideNav';
import type { SideNavCollapseButtonProps } from '@astryxdesign/core/SideNav';
import { HStack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { commonWebkitAppRegionNoDrag } from '../../styles/common';
import { styles, titlebarStyle } from './styles';

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
  const titleHandle = matches.findLast((match) => isRouteHandle(match.handle))?.handle;

  return (
    <header
      {...titlebarStyle}
      onDoubleClick={() => globalThis.electron.ipcRenderer.invoke('window:toggle-maximize')}
      aria-label="Window titlebar"
    >
      {showBackButton && (
        <IconButton
          {...commonWebkitAppRegionNoDrag}
          label="Back"
          icon={<Icon icon="chevronLeft" />}
          variant="ghost"
          size="sm"
          tooltip="Back"
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
            {titleHandle.title}
          </Text>
          {titleHandle.description && (
            <Text type="supporting" maxLines={1} textWrap="nowrap" xstyle={styles.description}>
              {titleHandle.description}
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
