// A simple label/value list for read-only detail screens. Functional layout,
// not a template dashboard: a hairline between rows, value right-aligned.
export interface InfoRow {
  label: string;
  value: string;
}

export function InfoRows({ rows }: { rows: InfoRow[] }) {
  return (
    <dl className="flex flex-col">
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-baseline justify-between gap-md border-t border-borderSubtle py-md first:border-t-0"
        >
          <dt className="type-body text-textSecondary">{r.label}</dt>
          <dd className="type-body text-right text-textPrimary">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
