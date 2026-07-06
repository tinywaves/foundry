import { useState } from 'react';
import { Input } from '@/components/ui/input';

export default function Mock2Tool() {
  const [value, setValue] = useState('');

  return (
    <div
      className="
        flex flex-col items-center justify-center gap-4 py-12 text-center
      "
    >
      <p className="text-muted-foreground max-w-md text-sm">
        Placeholder — replace with real utility.
      </p>
      <div className="flex w-full max-w-sm flex-col gap-2 text-start">
        <label htmlFor="mock2-input" className="text-sm font-medium">
          Echo input
        </label>
        <Input
          id="mock2-input"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Type something..."
        />
        <p className="text-muted-foreground min-h-5 text-sm">
          {value ? `Echo: ${value}` : 'Output will appear here.'}
        </p>
      </div>
    </div>
  );
}
