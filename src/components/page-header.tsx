export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">{title}</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">{description}</p>
      </div>
      {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
    </div>
  )
}

export function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="space-y-4">
      <div className="bg-muted h-10 w-48 animate-pulse rounded-lg" />
      <p className="text-muted-foreground text-sm">{label}</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-muted h-28 animate-pulse rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export function ErrorScreen({
  message,
  onReset,
}: {
  message: string
  onReset: () => void
}) {
  return (
    <div className="border-destructive/30 bg-destructive/5 mx-auto max-w-lg rounded-xl border p-6 text-center">
      <h1 className="font-heading text-2xl">Inventory could not load</h1>
      <p className="text-muted-foreground mt-2 text-sm">{message}</p>
      <button
        type="button"
        onClick={onReset}
        className="bg-primary text-primary-foreground mt-4 rounded-lg px-3 py-2 text-sm font-medium"
      >
        Reload sheet inventory
      </button>
    </div>
  )
}
