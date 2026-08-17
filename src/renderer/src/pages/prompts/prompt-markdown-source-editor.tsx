import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { useTheme } from '@astryxdesign/core/theme';
import CodeMirror, { EditorState, EditorView } from '@uiw/react-codemirror';
import type { Extension } from '@uiw/react-codemirror';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { getPromptContentLineSeparator } from './prompt-markdown-editor-model';

const markdownExtension = markdown({
  base: markdownLanguage,
  codeLanguages: languages,
});

const staticExtensions: Extension[] = [
  markdownExtension,
  EditorView.lineWrapping,
];

interface PromptMarkdownSourceEditorProps {
  describedBy?: string;
  hasError: boolean;
  height: string;
  inputID: string;
  isReadOnly: boolean;
  isVisible: boolean;
  onChange: (value: string) => void;
  value: string;
}

export function PromptMarkdownSourceEditor({
  describedBy,
  hasError,
  height,
  inputID,
  isReadOnly,
  isVisible,
  onChange,
  value,
}: PromptMarkdownSourceEditorProps) {
  const { mode: themeMode } = useTheme();
  const editorViewRef = useRef<EditorView | undefined>(undefined);
  const lineSeparator = getPromptContentLineSeparator(value);
  const extensions = useMemo<Extension[]>(() => {
    const contentAttributes: Record<string, string> = {
      'aria-label': 'Content',
      'aria-multiline': 'true',
      'aria-required': 'true',
      'id': inputID,
      'role': 'textbox',
      'spellcheck': 'false',
    };
    if (describedBy) {
      contentAttributes['aria-describedby'] = describedBy;
      contentAttributes['aria-invalid'] = 'true';
    }
    if (isReadOnly) {
      contentAttributes['aria-readonly'] = 'true';
    }

    return [
      ...staticExtensions,
      EditorView.contentAttributes.of(contentAttributes),
      ...(lineSeparator
        ? [EditorState.lineSeparator.of(lineSeparator)]
        : []),
    ];
  }, [describedBy, inputID, isReadOnly, lineSeparator]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }
    editorViewRef.current?.requestMeasure();
    if (hasError) {
      editorViewRef.current?.focus();
    }
  }, [hasError, isVisible]);

  const handleCreateEditor = useCallback((view: EditorView) => {
    editorViewRef.current = view;
    if (isVisible && hasError) {
      view.focus();
    }
  }, [hasError, isVisible]);

  return (
    <CodeMirror
      value={value}
      height={height}
      width="100%"
      theme={themeMode}
      extensions={extensions}
      editable={!isReadOnly}
      readOnly={isReadOnly}
      onChange={onChange}
      onCreateEditor={handleCreateEditor}
    />
  );
}
