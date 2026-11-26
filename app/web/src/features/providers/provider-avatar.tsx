import { Icon } from '@astryxdesign/core/Icon';
import { Square3Stack3DIcon } from '@heroicons/react/24/outline';
import * as stylex from '@stylexjs/stylex';
import { useState } from 'react';

const styles = stylex.create({
  image: {
    width: 32,
    height: 32,
    objectFit: 'cover',
    borderRadius: 6,
    flexShrink: 0,
  },
  large: { width: 56, height: 56, borderRadius: 12 },
});

export function ProviderAvatar({ avatar, name, size = 32 }: { avatar?: string | null; name: string; size?: 32 | 56 }) {
  const [failedURL, setFailedURL] = useState<string | null>(null);
  return avatar && failedURL !== avatar
    ? <img {...stylex.props(styles.image, size === 56 && styles.large)} src={avatar} alt={name} onError={() => setFailedURL(avatar)} />
    : <Icon icon={Square3Stack3DIcon} size="lg" color="secondary" />;
}
