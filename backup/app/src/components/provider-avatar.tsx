import type { ProviderAvatar as ProviderAvatarData } from '@dhzh/foundry-api-contract';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '#/components/ui/avatar';

export function ProviderAvatar({
  alt = '',
  avatar,
  className,
  name,
  size,
}: {
  alt?: string;
  avatar: ProviderAvatarData | null;
  className?: string;
  name: string;
  size?: 'default' | 'sm' | 'lg';
}) {
  return (
    <Avatar className={className} size={size}>
      {avatar && (
        <AvatarImage
          alt={alt}
          src={`data:${avatar.mimeType};base64,${avatar.data}`}
        />
      )}
      <AvatarFallback>{name.trim().charAt(0) || 'P'}</AvatarFallback>
    </Avatar>
  );
}
