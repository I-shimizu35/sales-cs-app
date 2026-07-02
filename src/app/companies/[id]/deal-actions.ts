"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase";
import { recordAuditLog } from "@/lib/audit";
import { getCurrentUserId, assertOwnerOrManager, assertOwnerOrClientCompany, CurrentActor } from "@/lib/auth";
import { DealStage } from "@/lib/types";

const DEAL_STAGES: DealStage[] = [
  "first_contact",
  "hearing",
  "proposal",
  "closing",
  "won",
  "lost",
];

// 案件管理表(ヨミ表統合)の編集可能フィールド。meeting_feedbackのみ社内限定(別途フィルタ)。
const EDITABLE_TEXT_FIELDS = [
  "title",
  "deal_category",
  "contact_name",
  "contact_title",
  "lead_source",
  "customer_issues",
  "proposal_content",
  "concerns",
  "lost_reason",
  "follow_up_policy",
  "minutes_doc_url",
  "first_meeting_video_url",
  "second_meeting_video_url",
  "proposal_doc_url",
  "quote_doc_url",
  "bant_budget",
  "bant_authority",
  "bant_need",
  "bant_timeline",
] as const;
const EDITABLE_NUMBER_FIELDS = ["amount", "win_probability", "expected_revenue", "temperature_score"] as const;
const EDITABLE_DATE_FIELDS = [
  "first_meeting_date",
  "proposal_meeting_date",
  "forecast_meeting_date",
  "expected_close_date",
  "last_contact_date",
] as const;
const EDITABLE_DATETIME_FIELDS = ["next_meeting_at"] as const;
const STAFF_ONLY_TEXT_FIELDS = ["meeting_feedback"] as const;

function userIdOfActor(actor: CurrentActor): string | null {
  return actor.type === "staff" ? actor.id : null;
}

/**
 * 案件が「初回接触より先の商談段階まで進んだ末に失注した」場合のみ、リードとして自動登録する。
 * updateDealStage / updateDealFields の両方から呼ばれる共通ロジック。
 */
async function maybeAutoCreateLeadFromLostDeal(
  supabase: SupabaseClient,
  params: {
    dealId: string;
    companyId: string;
    previousStage: DealStage;
    newStage: string;
    dealTitle: string;
    ownerUserId: string | null;
  }
): Promise<void> {
  if (params.newStage !== "lost") return;
  if (params.previousStage === "first_contact" || params.previousStage === "lost") return;

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", params.companyId)
    .maybeSingle();

  const { error } = await supabase.from("leads").insert({
    company_id: params.companyId,
    converted_from_deal_id: params.dealId,
    lead_company_name: company?.name ?? params.dealTitle,
    owner_user_id: params.ownerUserId,
    lead_source: "失注案件からの自動登録",
  });
  if (error) {
    console.warn("失注案件のリード自動登録に失敗しました:", error.message);
  }
}

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
    .select("owner_user_id, company_id, stage, title")
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

  await maybeAutoCreateLeadFromLostDeal(supabase, {
    dealId,
    companyId: existing.company_id,
    previousStage: existing.stage as DealStage,
    newStage: stage,
    dealTitle: existing.title,
    ownerUserId: existing.owner_user_id,
  });

  revalidatePath(`/companies/${existing.company_id}`);
  revalidatePath("/"); // ダッシュボードの対応中/受注件数の集計を最新化する
}

/**
 * 案件管理表(ヨミ表統合)からの汎用更新。フォームに含まれるフィールドのみ更新する。
 * クライアントポータルからも呼ばれるため、meeting_feedbackは社内スタッフのみ反映する。
 */
export async function updateDealFields(dealId: string, formData: FormData): Promise<void> {
  const supabase = createServerClient();

  const { data: existing, error: fetchError } = await supabase
    .from("deals")
    .select("owner_user_id, company_id, stage, title")
    .eq("id", dealId)
    .single();
  if (fetchError || !existing) {
    throw new Error(`案件情報の取得に失敗しました: ${fetchError?.message ?? ""}`);
  }

  const actor = await assertOwnerOrClientCompany(
    { ownerUserId: existing.owner_user_id, companyId: existing.company_id },
    "案件"
  );

  const update: Record<string, unknown> = {};

  for (const key of EDITABLE_TEXT_FIELDS) {
    if (formData.has(key)) update[key] = (formData.get(key) as string) || null;
  }
  for (const key of EDITABLE_NUMBER_FIELDS) {
    if (formData.has(key)) {
      const raw = formData.get(key) as string;
      update[key] = raw === "" ? null : Number(raw);
    }
  }
  for (const key of [...EDITABLE_DATE_FIELDS, ...EDITABLE_DATETIME_FIELDS]) {
    if (formData.has(key)) update[key] = (formData.get(key) as string) || null;
  }
  if (actor.type === "staff") {
    for (const key of STAFF_ONLY_TEXT_FIELDS) {
      if (formData.has(key)) update[key] = (formData.get(key) as string) || null;
    }
  }

  let newStage: string | null = null;
  if (formData.has("stage")) {
    const stage = formData.get("stage");
    if (typeof stage === "string" && DEAL_STAGES.includes(stage as DealStage)) {
      update.stage = stage;
      newStage = stage;
    } else {
      throw new Error("フェーズの値が不正です。");
    }
  }

  if (Object.keys(update).length === 0) return;

  const { error } = await supabase.from("deals").update(update).eq("id", dealId);
  if (error) {
    throw new Error(`案件情報の更新に失敗しました: ${error.message}`);
  }

  await recordAuditLog({
    userId: userIdOfActor(actor),
    action: "update",
    targetType: "deal",
    targetId: dealId,
    detail: { fields: Object.keys(update) },
  });

  if (newStage) {
    await maybeAutoCreateLeadFromLostDeal(supabase, {
      dealId,
      companyId: existing.company_id,
      previousStage: existing.stage as DealStage,
      newStage,
      dealTitle: existing.title,
      ownerUserId: existing.owner_user_id,
    });
  }

  revalidatePath("/deals");
  revalidatePath("/client/deals");
  revalidatePath(`/companies/${existing.company_id}`);
  revalidatePath("/");
}
