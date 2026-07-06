import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function Mock1Tool() {
  const [count, setCount] = useState(0);

  return (
    <div
      className="
        flex flex-col items-center justify-center gap-4 py-12 text-center
      "
    >
      <p className="text-muted-foreground max-w-md text-sm">
        Placeholder — replace with real utility.
      </p>
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => setCount((value) => value - 1)}>
          Decrease
        </Button>
        <span className="min-w-8 text-lg font-medium tabular-nums">{count}</span>
        <Button type="button" size="sm" onClick={() => setCount((value) => value + 1)}>
          Increase
        </Button>
      </div>
    </div>
  );
}
