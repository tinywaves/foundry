import { useTheme } from '#/components/theme-provider';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card';
import { Switch } from '#/components/ui/switch';

export function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <main className="w-full max-w-xl">
      <Card size="sm">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how Foundry looks on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <label
            className="flex cursor-pointer items-center justify-between gap-4"
            htmlFor="dark-mode"
          >
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">Dark mode</span>
              <span className="text-muted-foreground">
                Use the dark appearance for Foundry.
              </span>
            </span>
            <Switch
              id="dark-mode"
              checked={resolvedTheme === 'dark'}
              onCheckedChange={(checked) =>
                setTheme(checked ? 'dark' : 'light')}
            />
          </label>
        </CardContent>
      </Card>
    </main>
  );
}
