import { createServerClient } from "@/lib/supabase";
import { TranscriptionInputClient, DealOption, TranscriptHistoryItem } from "../transcription-input-client";

export const dynamic = "force-dynamic";

async function getDealOptions(): Promise<DealOption[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("deals")
    .select("id, title, company:companies(name)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`案件一覧の取得に失敗しました: ${error.message}`);

  // SupabaseのJOIN結果は型上ネスト配列になるためここで整形する
  return (data ?? []).map((d: any) => ({
    id: d.id,
    title: d.title,
    companyName: d.company?.name ?? "(企業不明)",
  }));
}

async function getTranscriptHistory(): Promise<TranscriptHistoryItem[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("transcripts")
    .select(
      "id, raw_text, created_at, meeting:meetings(held_at, deal:deals(title, company:companies(name)))"
    )
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(`文字起こし履歴の取得に失敗しました: ${error.message}`);

  return (data ?? []).map((t: any) => ({
    id: t.id,
    createdAt: t.created_at,
    heldAt: t.meeting?.held_at ?? null,
    dealTitle: t.meeting?.deal?.title ?? "(案件不明)",
    companyName: t.meeting?.deal?.company?.name ?? "(企業不明)",
    length: t.raw_text?.length ?? 0,
  }));
}

export default async function TranscriptsNewPage() {
  const [deals, history] = await Promise.all([getDealOptions(), getTranscriptHistory()]);
  return <TranscriptionInputClient deals={deals} history={history} />;
}
