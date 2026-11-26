import { useRef, useState } from 'react';
import { Icon } from '@astryxdesign/core/Icon';
import { Spinner } from '@astryxdesign/core/Spinner';
import { VStack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Tooltip } from '@astryxdesign/core/Tooltip';
import { XMarkIcon } from '@heroicons/react/24/outline';
import * as stylex from '@stylexjs/stylex';
import { useI18n } from '../../i18n';
import { ProviderAvatar } from './provider-avatar';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];

const styles = stylex.create({
  avatar: {
    position: 'relative',
    width: 56,
    height: 56,
  },
  upload: {
    'display': 'flex',
    'alignItems': 'center',
    'justifyContent': 'center',
    'width': '100%',
    'height': '100%',
    'padding': 0,
    'overflow': 'hidden',
    'border': 0,
    'borderRadius': 12,
    'backgroundColor': 'var(--color-background-muted)',
    'cursor': 'pointer',
    ':hover': { boxShadow: 'inset 0 0 0 1px var(--color-border-emphasized)' },
    ':focus-visible': {
      outline: '2px solid var(--color-accent)',
      outlineOffset: 2,
    },
    ':disabled': { cursor: 'default', opacity: 0.5 },
  },
  remove: {
    'position': 'absolute',
    'top': -4,
    'right': -4,
    'display': 'flex',
    'alignItems': 'center',
    'justifyContent': 'center',
    'width': 16,
    'height': 16,
    'padding': 0,
    'border': '2px solid var(--color-background-surface)',
    'borderRadius': 'var(--radius-full)',
    'backgroundColor': 'var(--color-background-muted)',
    'color': 'var(--color-icon-secondary)',
    'cursor': 'pointer',
    'transitionProperty': 'filter, transform',
    'transitionDuration': '140ms',
    'transitionTimingFunction': 'ease-out',
    ':enabled:hover': {
      filter: 'brightness(0.85)',
      transform: 'scale(1.1)',
    },
    ':enabled:active': { transform: 'scale(0.95)' },
    '@media (prefers-reduced-motion: reduce)': { transitionDuration: '0ms' },
    ':focus-visible': {
      outline: '2px solid var(--color-accent)',
      outlineOffset: 2,
    },
    ':disabled': { cursor: 'default', opacity: 0.5 },
  },
  removeIcon: { width: 8, height: 8 },
});

export function ProviderAvatarField({ value, onChange, isDisabled, isReading, onReadingChange }: {
  value: string | null;
  onChange: (value: string | null) => void;
  isDisabled: boolean;
  isReading: boolean;
  onReadingChange: (isReading: boolean) => void;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasError, setHasError] = useState(false);
  const isBusy = isReading || isDisabled;
  const upload = async (file: File) => {
    setHasError(false);
    if (!AVATAR_TYPES.includes(file.type) || file.size === 0 || file.size > MAX_AVATAR_BYTES) {
      setHasError(true);
      return;
    }
    onReadingChange(true);
    try {
      const dataURL = await readDataURL(file);
      const image = new Image();
      image.src = dataURL;
      await image.decode();
      onChange(dataURL);
    } catch {
      setHasError(true);
    } finally {
      onReadingChange(false);
    }
  };

  return (
    <VStack gap={2}>
      <Text type="label">{t('providers.avatar')}</Text>
      <div {...stylex.props(styles.avatar)}>
        <Tooltip content={t(value ? 'providers.avatarChange' : 'providers.avatarUpload')}>
          <button
            {...stylex.props(styles.upload)}
            type="button"
            aria-label={t(value ? 'providers.avatarChange' : 'providers.avatarUpload')}
            aria-busy={isReading}
            disabled={isBusy}
            onClick={() => inputRef.current?.click()}
          >
            {isReading
              ? <Spinner size="lg" />
              : <ProviderAvatar avatar={value} name={t('providers.avatar')} size={56} />}
          </button>
        </Tooltip>
        {value && (
          <Tooltip content={t('providers.avatarRemove')}>
            <button
              {...stylex.props(styles.remove)}
              type="button"
              aria-label={t('providers.avatarRemove')}
              disabled={isBusy}
              onClick={() => {
                setHasError(false);
                onChange(null);
              }}
            >
              <Icon icon={XMarkIcon} size="xsm" xstyle={styles.removeIcon} />
            </button>
          </Tooltip>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_TYPES.join(',')}
          aria-label={t('providers.avatarUpload')}
          hidden
          disabled={isBusy}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) {
              void upload(file);
            }
          }}
        />
      </div>
      <Text type="supporting" color="secondary">{t('providers.avatarDescription')}</Text>
      {hasError && <Text role="alert" type="supporting">{t('providers.avatarInvalid')}</Text>}
    </VStack>
  );
}

function readDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('Unable to read image')));
    reader.addEventListener('error', () => reject(reader.error ?? new Error('Unable to read image')));
    reader.readAsDataURL(file);
  });
}
