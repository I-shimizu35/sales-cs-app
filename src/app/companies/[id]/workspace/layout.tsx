import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { WorkspaceNav } from "@/components/workspace-nav";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const supabase = createServerClient();
  const { data: company } = await supabase.from("companies").select("name").eq("id", params.id).maybeSingle();
  if (!company) notFound();

  return (
    <div className="mx-auto w-full max-w-[1600px] px-8 py-10">
      <WorkspaceNav companyId={params.id} companyName={company.name} />
      {children}
    </div>
  );
}
