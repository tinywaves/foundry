import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from 'cn';

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        `
          peer relative inline-flex h-4 w-7 shrink-0 items-center rounded-full
          border border-transparent bg-input p-0.5 transition-colors outline-none
          focus-visible:border-ring focus-visible:ring-2
          focus-visible:ring-ring/30 disabled:cursor-not-allowed
          disabled:opacity-50 data-checked:bg-primary
        `,
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="
          pointer-events-none block size-3 rounded-full bg-background shadow-sm
          transition-transform data-checked:translate-x-3
        "
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
