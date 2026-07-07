import { useMemo, useState } from 'react';
import ReactJsonView from '@microlink/react-json-view';
import type { InteractionProps } from '@microlink/react-json-view';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const JSON_VIEW_CONFIG = {
  iconStyle: 'triangle',
  displayDataTypes: true,
  displayObjectSize: true,
  enableClipboard: true,
  indentWidth: 4,
  collapsed: 2,
  collapseStringsAfterLength: false,
} as const;

function toJsonViewSrc(value: unknown): object {
  if (typeof value === 'object' && value !== null) {
    return value;
  }

  return { value };
}

function applyTreeUpdate(
  setInput: (value: string) => void,
  { updated_src }: InteractionProps,
) {
  setInput(JSON.stringify(updated_src, null, 2));

  return true;
}

export default function JsonViewTool() {
  const [input, setInput] = useState('');

  const result = useMemo(() => {
    if (!input.trim()) {
      return { ok: true as const, formatted: '', value: undefined };
    }

    try {
      const parsed: unknown = JSON.parse(input);

      return {
        ok: true as const,
        formatted: JSON.stringify(parsed, null, 2),
        value: parsed,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON';

      return { ok: false as const, error: message };
    }
  }, [input]);

  const canViewTree = result.ok && Boolean(input.trim());
  const isEditorFullHeight = !canViewTree;

  return (
    <div
      className={cn(
        'flex min-h-0 flex-1 gap-3',
        canViewTree
          ? `
            max-lg:flex-col
            lg:flex-row lg:gap-4
          `
          : 'flex-col',
      )}
    >
      <div
        className={cn(
          'relative flex min-h-0 min-w-0 flex-col',
          isEditorFullHeight && 'min-h-0 flex-1',
          canViewTree && `
            max-h-40 shrink-0
            lg:h-auto lg:max-h-none lg:w-[min(34%,24rem)] lg:shrink-0
          `,
        )}
      >
        <div className="absolute inset-s-1.5 top-1.5 z-10 flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={!result.ok || !input.trim()}
            onClick={() => {
              if (result.ok) {
                setInput(result.formatted);
              }
            }}
          >
            Format
          </Button>
          <Button type="button" variant="outline" size="xs" onClick={() => setInput('')}>
            Clear
          </Button>
        </div>
        {input.trim()
          ? (result.ok
              ? (
                  <span
                    className="
                      text-muted-foreground absolute inset-e-2.5 top-2 z-10
                      text-xs
                    "
                  >
                    Valid JSON
                  </span>
                )
              : (
                  <span
                    className="
                      text-destructive absolute inset-e-2.5 top-2 z-10
                      max-w-[50%] truncate text-xs
                    "
                  >
                    {result.error}
                  </span>
                ))
          : null}
        <Textarea
          id="json-input"
          dir="ltr"
          aria-label="JSON input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder='{"key": "value"}'
          spellCheck={false}
          aria-invalid={input.trim() ? !result.ok : undefined}
          className={cn(
            'field-sizing-fixed min-h-0 flex-1 pt-10 font-mono',
            isEditorFullHeight && 'min-h-48',
          )}
        />
      </div>
      {canViewTree
        ? (
            <div
              dir="ltr"
              className="
                bg-muted/30 min-h-0 min-w-0 flex-1 overflow-auto rounded-xl
                border p-3
                max-lg:min-h-48
              "
            >
              <ReactJsonView
                src={toJsonViewSrc(result.value)}
                name={false}
                theme="rjv-default"
                style={{ backgroundColor: 'transparent' }}
                iconStyle={JSON_VIEW_CONFIG.iconStyle}
                displayDataTypes={JSON_VIEW_CONFIG.displayDataTypes}
                displayObjectSize={JSON_VIEW_CONFIG.displayObjectSize}
                enableClipboard={JSON_VIEW_CONFIG.enableClipboard}
                indentWidth={JSON_VIEW_CONFIG.indentWidth}
                collapsed={JSON_VIEW_CONFIG.collapsed}
                collapseStringsAfterLength={
                  JSON_VIEW_CONFIG.collapseStringsAfterLength
                }
                onEdit={(edit) => applyTreeUpdate(setInput, edit)}
                onAdd={(add) => applyTreeUpdate(setInput, add)}
                onDelete={(del) => applyTreeUpdate(setInput, del)}
              />
            </div>
          )
        : null}
    </div>
  );
}
