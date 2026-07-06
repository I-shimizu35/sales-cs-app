import { createServerClient } from "@/lib/supabase";
import { getAccessibleCompanyIds } from "@/lib/auth";
import { FeedbackGenerateClient, TranscriptOption } from "./feedback-generate-client";

export const dynamic = "force-dynamic";

async function getTranscriptOptions(accessibleCompanyIds: string[] | null): Promise<TranscriptOption[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("transcripts")
    .select(
      "id, created_at, meeting:meetings(held_at, deal:deals(title, company_id, company:companies(name)))"
    )
    .order("created_at", { ascending: false })
    .limit(accessibleCompanyIds ? 200 : 30);

  if (error) throw new Error(`文字起こし一覧の取得に失敗しました: ${error.message}`);

  const rows = (data ?? []) as any[];
  const scoped = accessibleCompanyIds
    ? rows.filter((t) => accessibleCompanyIds.includes(t.meeting?.deal?.company_id))
    : rows;

  return scoped.slice(0, 30).map((t: any) => ({
    id: t.id,
    companyId: t.meeting?.deal?.company_id ?? "",
    companyName: t.meeting?.deal?.company?.name ?? "(企業不明)",
    label: `${t.meeting?.held_at ?? new Date(t.created_at).toLocaleDateString("ja-JP")} - ${
      t.meeting?.deal?.title ?? ""
    }`,
  }));
}

export default async function FeedbackGeneratePage({
  searchParams,
}: {
  searchParams: { transcriptId?: string };
}) {
  const supabase = createServerClient();
  const accessibleCompanyIds = await getAccessibleCompanyIds(supabase);
  const transcripts = await getTranscriptOptions(accessibleCompanyIds);
  return (
    <FeedbackGenerateClient
      transcripts={transcripts}
      initialTranscriptId={searchParams.transcriptId}
    />
  );
}
