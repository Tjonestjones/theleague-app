/** Shared page header and section shells for league pages. */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="border-b border-white/8 px-6 md:px-10 pt-8 pb-6">
      <div className="flex flex-wrap items-end justify-between gap-4 max-w-7xl">
        <div className="min-w-0">
          {eyebrow && <p className="text-xs font-medium text-slate-500 mb-1.5">{eyebrow}</p>}
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1.5 text-sm text-slate-400 max-w-2xl">{description}</p>}
        </div>
        {actions}
      </div>
    </header>
  );
}

export function Section({
  title,
  note,
  className = "",
  children,
}: {
  title: string;
  note?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={className}>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {note && <p className="text-xs text-slate-500 mt-0.5">{note}</p>}
      </div>
      {children}
    </section>
  );
}
