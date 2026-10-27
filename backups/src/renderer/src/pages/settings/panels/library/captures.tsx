import { useEffect, useState } from 'react';
import {
  ArrowPathRoundedSquareIcon,
  BarsArrowUpIcon,
  BugAntIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Selector } from '@astryxdesign/core/Selector';
import { TextInput } from '@astryxdesign/core/TextInput';
import { useI18n } from '@renderer/i18n/use-i18n';
import { SettingsCard } from '../../components/settings-card';
import { SettingsRow } from '../../components/settings-row';
import { CONTROL_WIDTH } from '../../components/settings-row-styles';
import type { CaptureSettings, PanelProps } from '../../types';

function ApiKeyField({
  value,
  label,
  placeholder,
  onChange,
}: {
  value: string;
  label: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect, @eslint-react/set-state-in-effect
    setDraft(value);
  }, [value]);

  const commit = () => {
    if (draft !== value) {
      onChange(draft.trim());
    }
  };

  return (
    <TextInput
      label={label}
      isLabelHidden
      size="sm"
      type="password"
      value={draft}
      onChange={setDraft}
      onBlur={commit}
      onEnter={commit}
      placeholder={placeholder}
      hasClear
      width={CONTROL_WIDTH}
    />
  );
}

export function CapturesSettingsBlock({ settings, update }: PanelProps) {
  const { t } = useI18n();
  const library = settings.library;
  const captures = library.captures;
  const selectedApiKey = captures.fetcher ? captures[captures.fetcher].apiKey : '';

  const updateCaptures = (patch: Partial<CaptureSettings>) => {
    update('library', {
      ...library,
      captures: {
        ...captures,
        ...patch,
        firecrawl: { ...captures.firecrawl, ...patch.firecrawl },
        deepseek: { ...captures.deepseek, ...patch.deepseek },
      },
    });
  };

  const setApiKey = (apiKey: string) => {
    if (!captures.fetcher) {
      return;
    }
    updateCaptures({
      [captures.fetcher]: { apiKey },
    });
  };

  return (
    <SettingsCard title={t('settings.captures')}>
      <SettingsRow
        key="fetcher"
        title={t('settings.capturesFetcher')}
        icon={BugAntIcon}
        description={t('settings.capturesFetcherDescription')}
        control={(
          <Selector
            label={t('settings.capturesFetcher')}
            isLabelHidden
            size="sm"
            width={CONTROL_WIDTH}
            value={captures.fetcher ?? 'none'}
            onChange={(value) => {
              updateCaptures({
                fetcher: value === 'none' ? null : value as CaptureSettings['fetcher'],
              });
            }}
            options={[
              { value: 'none', label: t('settings.capturesNotConfigured') },
              { value: 'firecrawl', label: 'Firecrawl' },
              { value: 'deepseek', label: 'DeepSeek Fetch' },
            ]}
          />
        )}
      />
      {captures.fetcher && (
        <SettingsRow
          key={`api-key-${captures.fetcher}`}
          title={t('settings.capturesApiKey')}
          icon={KeyIcon}
          description={t('settings.capturesApiKeyDescription')}
          control={(
            <ApiKeyField
              key={captures.fetcher}
              value={selectedApiKey}
              label={t('settings.capturesApiKey')}
              placeholder={t('settings.capturesApiKeyPlaceholder')}
              onChange={setApiKey}
            />
          )}
        />
      )}
      <SettingsRow
        key="max-attempts"
        title={t('settings.capturesMaxAttempts')}
        icon={ArrowPathRoundedSquareIcon}
        description={t('settings.capturesMaxAttemptsDescription')}
        control={(
          <NumberInput
            label={t('settings.capturesMaxAttempts')}
            isLabelHidden
            size="sm"
            value={captures.maxAttempts}
            onChange={(value) => {
              updateCaptures({ maxAttempts: value });
            }}
            min={1}
            max={10}
            step={1}
            isIntegerOnly
            width={120}
          />
        )}
      />
      <SettingsRow
        key="scrape-concurrency"
        title={t('settings.capturesConcurrency')}
        icon={BarsArrowUpIcon}
        description={t('settings.capturesConcurrencyDescription')}
        control={(
          <NumberInput
            label={t('settings.capturesConcurrency')}
            isLabelHidden
            size="sm"
            value={captures.scrapeConcurrency}
            onChange={(value) => {
              updateCaptures({ scrapeConcurrency: value });
            }}
            min={1}
            max={5}
            step={1}
            isIntegerOnly
            width={120}
          />
        )}
      />
    </SettingsCard>
  );
}
