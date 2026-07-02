import { createServerClient } from "@/lib/supabase";
import { FeedbackGenerateClient, TranscriptOption } from "./feedback-generate-client";

export const dynamic = "force-dynamic";

async function getTranscriptOptions(): Promise<TranscriptOption[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("transcripts")
    .select(
      "id, created_at, meeting:meetings(held_at, deal:deals(title, company:companies(name)))"
    )
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw new Error(`文字起こし一覧の取得に失敗しました: ${error.message}`);

  return (data ?? []).map((t: any) => ({
    id: t.id,
    label: `${t.meeting?.held_at ?? new Date(t.created_at).toLocaleDateString("ja-JP")} - ${
      t.meeting?.deal?.company?.name ?? "(企業不明)"
    } ${t.meeting?.deal?.title ?? ""}`,
  }));
}

export default async function FeedbackGeneratePage({
  searchParams,
}: {
  searchParams: { transcriptId?: string };
}) {
  const transcripts = await getTranscriptOptions();
  return (
    <FeedbackGenerateClient
      transcripts={transcripts}
      initialTranscriptId={searchParams.transcriptId}
    />
  );
}
