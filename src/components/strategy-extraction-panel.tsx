export interface ExtractionField {
  label: string;
  value: string | number | null | undefined;
}

export function StrategyExtractionPanel({ fields }: { fields: ExtractionField[] }) {
  const filledCount = fields.filter((f) => f.value !== null && f.value !== undefined && f.value !== "").length;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <h4 className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-400">
        抽出済みデータ
        <span className="text-[11px] font-normal normal-case text-slate-400">
          {filledCount}/{fields.length}項目
        </span>
      </h4>
      <dl className="space-y-2.5">
        {fields.map((f) => (
          <div key={f.label}>
            <dt className="text-xs text-slate-400">{f.label}</dt>
            <dd className="text-sm text-slate-700">
              {f.value !== null && f.value !== undefined && f.value !== "" ? (
                f.value
              ) : (
                <span className="text-slate-300">未入力</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
