import { Layers } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function ProviderAvatar({ avatar, name, size = 32 }: { avatar?: string | null; name: string; size?: 32 | 56 }) {
  return (
    <Avatar className={cn('size-8 rounded-md', size === 56 && 'size-14 rounded-xl')}>
      {avatar && <AvatarImage src={avatar} alt={name} className="object-cover" />}
      <AvatarFallback className="rounded-[inherit]" aria-label={name}>
        <Layers className="size-5 text-muted-foreground" />
      </AvatarFallback>
    </Avatar>
  );
}
