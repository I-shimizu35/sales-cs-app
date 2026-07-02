"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { recordAuditLog } from "@/lib/audit";
import { getCurrentUserId, assertOwnerOrManager } from "@/lib/auth";
import { DealStage } from "@/lib/types";

const DEAL_STAGES: DealStage[] = [
  "first_contact",
  "hearing",
  "proposal",
  "closing",
  "won",
  "lost",
];

export async function createDeal(companyId: string, formData: FormData): Promise<void> {
  const title = formData.get("title");
  if (typeof title !== "string" || title.trim() === "") {
    throw new Error("案件名は必須です。");
  }

  const supabase = createServerClient();
  const userId = await getCurrentUserId();

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("owner_user_id")
    .eq("id", companyId)
    .single();
  if (companyError || !company) {
    throw new Error(`企業情報の取得に失敗しました: ${companyError?.message ?? ""}`);
  }
  await assertOwnerOrManager(company.owner_user_id, "企業");

  const ownerUserId = formData.get("owner_user_id");

  const { data, error } = await supabase
    .from("deals")
    .insert({
      company_id: companyId,
      title: title.trim(),
      owner_user_id: (ownerUserId as string) || null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`案件作成に失敗しました: ${error.message}`);
  }

  await recordAuditLog({
    userId,
    action: "create",
    targetType: "deal",
    targetId: data.id,
  });

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/"); // ダッシュボードの集計もこのタイミングで最新化する
  revalidatePath("/transcripts/new"); // 案件プルダウンにも反映させる
  redirect(`/companies/${companyId}`);
}

export async function updateDealStage(dealId: string, formData: FormData): Promise<void> {
  const stage = formData.get("stage");
  if (typeof stage !== "string" || !DEAL_STAGES.includes(stage as DealStage)) {
    throw new Error("フェーズの値が不正です。");
  }

  const supabase = createServerClient();
  const userId = await getCurrentUserId();

  const { data: existing, error: fetchError } = await supabase
    .from("deals")
    .select("owner_user_id, company_id, stage")
    .eq("id", dealId)
    .single();
  if (fetchError || !existing) {
    throw new Error(`案件情報の取得に失敗しました: ${fetchError?.message ?? ""}`);
  }
  await assertOwnerOrManager(existing.owner_user_id, "案件");

  const { error } = await supabase.from("deals").update({ stage }).eq("id", dealId);
  if (error) {
    throw new Error(`案件フェーズの更新に失敗しました: ${error.message}`);
  }

  await recordAuditLog({
    userId,
    action: "update",
    targetType: "deal",
    targetId: dealId,
    detail: { field: "stage", from: existing.stage, to: stage },
  });

  revalidatePath(`/companies/${existing.company_id}`);
  revalidatePath("/"); // ダッシュボードの対応中/受注件数の集計を最新化する
}
