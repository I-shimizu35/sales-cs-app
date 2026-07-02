/** 生成結果(JSON)を、キーごとに簡易的に読みやすく表示する共通コンポーネント */
export function GeneratedContentView({ content }: { content: Record<string, unknown> }) {
  return (
    <>
      {Object.entries(content).map(([key, value]) => (
        <div key={key}>
          <span className="mb-1 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
            {key}
          </span>
          {Array.isArray(value) ? (
            <ul className="ml-4 mt-1 list-disc space-y-1 text-slate-700">
              {value.map((item, i) => (
                <li key={i}>{typeof item === "string" ? item : JSON.stringify(item)}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 leading-relaxed text-slate-700">
              {typeof value === "string" ? value : JSON.stringify(value)}
            </p>
          )}
        </div>
      ))}
    </>
  );
}
