import { createServerClient } from "@/lib/supabase";
import { getAccessibleCompanyIds } from "@/lib/auth";
import { TranscriptionInputClient, DealOption, TranscriptHistoryItem } from "../transcription-input-client";

export const dynamic = "force-dynamic";

async function getDealOptions(accessibleCompanyIds: string[] | null): Promise<DealOption[]> {
  const supabase = createServerClient();
  let query = supabase
    .from("deals")
    .select("id, title, company:companies(name)")
    .order("created_at", { ascending: false });
  if (accessibleCompanyIds) query = query.in("company_id", accessibleCompanyIds);
  const { data, error } = await query;

  if (error) throw new Error(`案件一覧の取得に失敗しました: ${error.message}`);

  // SupabaseのJOIN結果は型上ネスト配列になるためここで整形する
  return (data ?? []).map((d: any) => ({
    id: d.id,
    title: d.title,
    companyName: d.company?.name ?? "(企業不明)",
  }));
}

async function getTranscriptHistory(accessibleCompanyIds: string[] | null): Promise<TranscriptHistoryItem[]> {
  const supabase = createServerClient();
  let query = supabase
    .from("transcripts")
    .select(
      "id, raw_text, created_at, meeting:meetings(held_at, deal:deals(title, company_id, company:companies(name)))"
    )
    .order("created_at", { ascending: false })
    .limit(accessibleCompanyIds ? 200 : 20);

  const { data, error } = await query;
  if (error) throw new Error(`文字起こし履歴の取得に失敗しました: ${error.message}`);

  const rows = (data ?? []) as any[];
  const scoped = accessibleCompanyIds
    ? rows.filter((t) => accessibleCompanyIds.includes(t.meeting?.deal?.company_id))
    : rows;

  return scoped.slice(0, 20).map((t: any) => ({
    id: t.id,
    createdAt: t.created_at,
    heldAt: t.meeting?.held_at ?? null,
    dealTitle: t.meeting?.deal?.title ?? "(案件不明)",
    companyName: t.meeting?.deal?.company?.name ?? "(企業不明)",
    length: t.raw_text?.length ?? 0,
  }));
}

export default async function TranscriptsNewPage() {
  const supabase = createServerClient();
  const accessibleCompanyIds = await getAccessibleCompanyIds(supabase);
  const [deals, history] = await Promise.all([
    getDealOptions(accessibleCompanyIds),
    getTranscriptHistory(accessibleCompanyIds),
  ]);
  return <TranscriptionInputClient deals={deals} history={history} />;
}
