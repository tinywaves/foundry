import { Spinner } from '@/components/ui/spinner';
import { Hint, IconGlyph } from '@/components/workbench';
import { useRef, useState } from 'react';
import { X as XMarkIcon } from 'lucide-react';
import { useI18n } from '../../i18n';
import { ProviderAvatar } from './provider-avatar';

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
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
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{t('providers.avatar')}</span>
      <div className="relative size-14">
        <Hint content={t(value ? 'providers.avatarChange' : 'providers.avatarUpload')}>
          <button type="button" aria-label={t(value ? 'providers.avatarChange' : 'providers.avatarUpload')} aria-busy={isReading} disabled={isBusy} onClick={() => inputRef.current?.click()} className="flex size-full items-center justify-center overflow-hidden rounded-xl bg-muted hover:ring-1 hover:ring-border focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50">
            {isReading
              ? <Spinner />
              : <ProviderAvatar avatar={value} name={t('providers.avatar')} size={56} />}
          </button>
        </Hint>
        {value && (
          <Hint content={t('providers.avatarRemove')}>
            <button
              type="button"
              aria-label={t('providers.avatarRemove')}
              disabled={isBusy}
              onClick={() => {
                setHasError(false);
                onChange(null);
              }}
              className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full border-2 border-background bg-muted text-muted-foreground hover:brightness-85 focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
            >
              <IconGlyph icon={XMarkIcon} className="size-2 shrink-0" />
            </button>
          </Hint>
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
      <span className="text-xs text-muted-foreground">{t('providers.avatarDescription')}</span>
      {hasError && <span role="alert" className="text-xs text-muted-foreground">{t('providers.avatarInvalid')}</span>}
    </div>
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
