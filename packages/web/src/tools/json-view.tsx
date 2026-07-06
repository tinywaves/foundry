import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function JsonViewTool() {
  const [input, setInput] = useState('');

  const result = useMemo(() => {
    if (!input.trim()) {
      return { ok: true as const, formatted: '' };
    }

    try {
      const parsed: unknown = JSON.parse(input);

      return { ok: true as const, formatted: JSON.stringify(parsed, null, 2) };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid JSON';

      return { ok: false as const, error: message };
    }
  }, [input]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!result.ok || !input.trim()}
          onClick={() => {
            if (result.ok) {
              setInput(result.formatted);
            }
          }}
        >
          Format
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setInput('')}>
          Clear
        </Button>
      </div>
      <div
        className="
          grid min-h-80 gap-4
          lg:grid-cols-2
        "
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="json-input" className="text-sm font-medium">
            Input
          </label>
          <textarea
            id="json-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder='{"key": "value"}'
            spellCheck={false}
            className="
              bg-background
              focus-visible:border-ring focus-visible:ring-ring/30
              min-h-70 flex-1 resize-y rounded-xl border p-3 font-mono text-sm
              outline-none
              focus-visible:ring-3
            "
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Output</span>
          <div
            className="
              bg-muted/30 min-h-70 flex-1 overflow-auto rounded-xl border p-3
            "
          >
            {input.trim()
              ? (result.ok
                  ? (
                      <pre className="font-mono text-sm whitespace-pre-wrap">{result.formatted}</pre>
                    )
                  : (
                      <p className="text-destructive text-sm">{result.error}</p>
                    ))
              : (
                  <p className="text-muted-foreground text-sm">Enter JSON to see formatted output.</p>
                )}
          </div>
        </div>
      </div>
    </div>
  );
}
