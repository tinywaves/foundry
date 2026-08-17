import * as stylex from '@stylexjs/stylex';

export const applicationSidebarDefaultWidth = 200;

export const applicationSidebarResizeConfig = {
  defaultWidth: applicationSidebarDefaultWidth,
  minWidth: applicationSidebarDefaultWidth,
  maxWidth: 400,
  autoSaveId: 'foundry-app-side-nav',
};

export const applicationSidebarStyles = stylex.create({
  root: {
    overflowX: 'clip',
  },
});
