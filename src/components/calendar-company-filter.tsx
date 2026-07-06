"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function CalendarCompanyFilter({ companies }: { companies: { id: string; name: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCompanyId = searchParams.get("companyId") ?? "";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("companyId", value);
    else params.delete("companyId");
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <select value={currentCompanyId} onChange={handleChange} className="field w-auto">
      <option value="">企業: すべて</option>
      {companies.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
