import {
  lazy,
  Suspense,
} from 'react';
import { useTranslation } from 'react-i18next';

import type { MarkdownEditorProps } from './markdown-editor';
import { loadMarkdownEditor } from './markdown-editor-loader';

const MarkdownEditor = lazy(async () => {
  const module = await loadMarkdownEditor();
  return { default: module.MarkdownEditor };
});

export function LazyMarkdownEditor(props: MarkdownEditorProps) {
  const { t } = useTranslation();

  return (
    <Suspense
      fallback={(
        <div
          style={{ height: props.height ?? '16rem' }}
          className="
            flex items-center justify-center text-xs text-muted-foreground
          "
        >
          {t('instructions.editorLoading')}
        </div>
      )}
    >
      <MarkdownEditor {...props} />
    </Suspense>
  );
}
