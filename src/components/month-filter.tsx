"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function MonthFilter({ availableMonths }: { availableMonths: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentMonth = searchParams.get("month") ?? "";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("month", value);
    else params.delete("month");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="card mb-6 flex items-center gap-3 p-4">
      <label className="field-label mb-0">対象月(新規商談日基準)</label>
      <select value={currentMonth} onChange={handleChange} className="field w-auto">
        <option value="">すべて</option>
        {availableMonths.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
