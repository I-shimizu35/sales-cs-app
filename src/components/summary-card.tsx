import Link from "next/link";

export function SummaryCard({
  icon,
  label,
  value,
  unit,
  accent = "text-slate-500",
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  unit?: string;
  accent?: string;
  href?: string;
}) {
  const content = (
    <>
      <div className={`mb-2 flex items-center gap-2 ${accent}`}>
        {icon}
        <h2 className="text-sm font-medium">{label}</h2>
      </div>
      <div className="text-3xl font-semibold tracking-tight text-slate-900">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-slate-500">{unit}</span>}
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="card p-5 transition-colors hover:border-brand-300">
        {content}
      </Link>
    );
  }
  return <div className="card p-5">{content}</div>;
}
