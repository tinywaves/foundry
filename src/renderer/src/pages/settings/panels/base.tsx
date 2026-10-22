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
import { SettingsCard } from '../components/settings-card';
import { SettingsRow } from '../components/settings-row';
import { CONTROL_WIDTH } from '../components/settings-row-styles';
import type { BaseSettings, PanelProps } from '../types';

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

export function BasePanel({ settings, update }: PanelProps) {
  const { t } = useI18n();
  const base = settings.base;
  const selectedApiKey = base.fetcher ? base[base.fetcher].apiKey : '';

  const updateBase = (patch: Partial<BaseSettings>) => {
    update('base', {
      ...base,
      ...patch,
      firecrawl: { ...base.firecrawl, ...patch.firecrawl },
      deepseek: { ...base.deepseek, ...patch.deepseek },
    });
  };

  const setApiKey = (apiKey: string) => {
    if (!base.fetcher) {
      return;
    }
    updateBase({
      [base.fetcher]: { apiKey },
    });
  };

  return (
    <SettingsCard>
      <SettingsRow
        key="fetcher"
        title={t('settings.baseFetcher')}
        icon={BugAntIcon}
        description={t('settings.baseFetcherDescription')}
        control={(
          <Selector
            label={t('settings.baseFetcher')}
            isLabelHidden
            size="sm"
            width={192}
            value={base.fetcher ?? 'none'}
            onChange={(value) => {
              updateBase({
                fetcher: value === 'none' ? null : value as BaseSettings['fetcher'],
              });
            }}
            options={[
              { value: 'none', label: t('settings.baseNotConfigured') },
              { value: 'firecrawl', label: 'Firecrawl' },
              { value: 'deepseek', label: 'DeepSeek Fetch' },
            ]}
          />
        )}
      />
      {base.fetcher && (
        <SettingsRow
          key={`api-key-${base.fetcher}`}
          title={t('settings.baseApiKey')}
          icon={KeyIcon}
          description={t('settings.baseApiKeyDescription')}
          control={(
            <ApiKeyField
              key={base.fetcher}
              value={selectedApiKey}
              label={t('settings.baseApiKey')}
              placeholder={t('settings.baseApiKeyPlaceholder')}
              onChange={setApiKey}
            />
          )}
        />
      )}
      <SettingsRow
        key="max-attempts"
        title={t('settings.baseMaxAttempts')}
        icon={ArrowPathRoundedSquareIcon}
        description={t('settings.baseMaxAttemptsDescription')}
        control={(
          <NumberInput
            label={t('settings.baseMaxAttempts')}
            isLabelHidden
            size="sm"
            value={base.maxAttempts}
            onChange={(value) => {
              updateBase({ maxAttempts: value });
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
        title={t('settings.baseConcurrency')}
        icon={BarsArrowUpIcon}
        description={t('settings.baseConcurrencyDescription')}
        control={(
          <NumberInput
            label={t('settings.baseConcurrency')}
            isLabelHidden
            size="sm"
            value={base.scrapeConcurrency}
            onChange={(value) => {
              updateBase({ scrapeConcurrency: value });
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
