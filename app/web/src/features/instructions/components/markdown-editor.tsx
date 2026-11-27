import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import {
  useMemo,
  useSyncExternalStore,
} from 'react';
import { useTranslation } from 'react-i18next';

import '@/lib/monaco';

export interface MarkdownEditorProps {
  value: string;
  ariaLabel: string;
  placeholder: string;
  readOnly?: boolean;
  height?: string;
  onChange: (value: string) => void;
}

export function MarkdownEditor({
  value,
  ariaLabel,
  placeholder,
  readOnly = false,
  height = '16rem',
  onChange,
}: MarkdownEditorProps) {
  const { t } = useTranslation();
  const isDark = useSyncExternalStore(subscribeTheme, isDarkTheme);
  const options = useMemo<editor.IStandaloneEditorConstructionOptions>(
    () => ({
      ariaLabel,
      automaticLayout: true,
      contextmenu: true,
      folding: false,
      glyphMargin: false,
      lineDecorationsWidth: 12,
      lineNumbers: 'off',
      minimap: { enabled: false },
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      padding: { top: 12, bottom: 12 },
      placeholder,
      readOnly,
      renderLineHighlight: 'none',
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      wrappingIndent: 'none',
    }),
    [ariaLabel, placeholder, readOnly],
  );

  return (
    <Editor
      height={height}
      language="markdown"
      theme={isDark ? 'vs-dark' : 'vs'}
      value={value}
      options={options}
      loading={(
        <div className="text-xs text-muted-foreground">
          {t('instructions.editorLoading')}
        </div>
      )}
      onChange={(markdown = '') => {
        onChange(markdown);
      }}
    />
  );
}

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  return () => observer.disconnect();
}

function isDarkTheme() {
  return document.documentElement.classList.contains('dark');
}
