import { SideNavCollapseButton } from '@astryxdesign/core/SideNav';
import type { SideNavCollapseButtonProps } from '@astryxdesign/core/SideNav';
import { titlebarStyle, titlebarCollapseButtonStyle } from './styles';

export default function WindowTitlebar({ collapsible }: Partial<Pick<SideNavCollapseButtonProps, 'collapsible'>>) {
  return (
    <header
      {...titlebarStyle}
      onDoubleClick={() => globalThis.electron.ipcRenderer.invoke('window:toggle-maximize')}
      aria-label="Window titlebar"
    >
      {collapsible && (
        <SideNavCollapseButton
          {...titlebarCollapseButtonStyle}
          collapsible={collapsible}
          size="sm"
          onDoubleClick={(event) => event.stopPropagation()}
        />
      )}
    </header>
  );
}
