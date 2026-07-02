export function SummaryCard({
  icon,
  label,
  value,
  unit,
  accent = "text-slate-500",
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  unit?: string;
  accent?: string;
}) {
  return (
    <div className="card p-5">
      <div className={`mb-2 flex items-center gap-2 ${accent}`}>
        {icon}
        <h2 className="text-sm font-medium">{label}</h2>
      </div>
      <div className="text-3xl font-semibold tracking-tight text-slate-900">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-slate-500">{unit}</span>}
      </div>
    </div>
  );
}
