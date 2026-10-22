import {
  ChatBubbleLeftIcon,
  CircleStackIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  FolderIcon,
  Square3Stack3DIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';

export const appIcons = {
  overview: Squares2X2Icon,
  base: CircleStackIcon,
  library: FolderIcon,
  prompts: DocumentTextIcon,
  providers: Square3Stack3DIcon,
  chat: ChatBubbleLeftIcon,
  settings: Cog6ToothIcon,
} as const;

export type AppIconName = keyof typeof appIcons;
