export function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Overview and workspace activity.
        </p>
      </div>
      {Array.from({ length: 24 }, (_, index) => (
        <div
          key={index}
          className="bg-card text-card-foreground rounded-xl border p-4"
        >
          <p className="font-medium">
            Section
            {index + 1}
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Placeholder content to verify the main panel scrolls independently
            while the sidebar and header stay fixed.
          </p>
        </div>
      ))}
    </div>
  );
}
