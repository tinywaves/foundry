export function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Workspace preferences and configuration.
        </p>
      </div>
      <div className="bg-card text-card-foreground rounded-xl border p-4">
        <p className="text-muted-foreground text-sm">
          Settings content will go here.
        </p>
      </div>
    </div>
  );
}
