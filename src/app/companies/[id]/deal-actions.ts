"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase";
import { recordAuditLog } from "@/lib/audit";
import { assertOwnerOrClientCompany, CurrentActor } from "@/lib/auth";
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
 * 案件が失注(lost)になった場合、リードとして自動登録する。
 * updateDealFields から呼ばれる。既にlostだった場合(再保存等)は重複登録を避けるためスキップする。
 * 案件管理表に既に入力済みの内容(顧客課題・提案内容・失注理由・最終接触日等)を引き継ぎ、
 * リード側での再入力(二度手間)を避ける。
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
  if (params.previousStage === "lost") return;

  const [{ data: company }, { data: deal }] = await Promise.all([
    supabase.from("companies").select("name").eq("id", params.companyId).maybeSingle(),
    supabase
      .from("deals")
      .select("contact_name, contact_title, customer_issues, proposal_content, lost_reason, last_contact_date")
      .eq("id", params.dealId)
      .maybeSingle(),
  ]);

  const activitySummaryParts = [
    deal?.contact_name ? `担当者: ${deal.contact_name}${deal.contact_title ? `(${deal.contact_title})` : ""}` : null,
    deal?.customer_issues ? `顧客課題: ${deal.customer_issues}` : null,
    deal?.proposal_content ? `提案内容: ${deal.proposal_content}` : null,
  ].filter((s): s is string => !!s);

  const { error } = await supabase.from("leads").insert({
    company_id: params.companyId,
    converted_from_deal_id: params.dealId,
    lead_company_name: company?.name ?? params.dealTitle,
    owner_user_id: params.ownerUserId,
    lead_source: "失注案件からの自動登録",
    activity_summary: activitySummaryParts.length > 0 ? activitySummaryParts.join("\n") : null,
    last_approach_result: deal?.lost_reason ?? null,
    last_approach_at: deal?.last_contact_date ? new Date(deal.last_contact_date).toISOString() : null,
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

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("owner_user_id")
    .eq("id", companyId)
    .single();
  if (companyError || !company) {
    throw new Error(`企業情報の取得に失敗しました: ${companyError?.message ?? ""}`);
  }
  const actor = await assertOwnerOrClientCompany(
    { ownerUserId: company.owner_user_id, companyId },
    "企業"
  );

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
    userId: userIdOfActor(actor),
    action: "create",
    targetType: "deal",
    targetId: data.id,
  });

  revalidatePath(`/companies/${companyId}`);
  revalidatePath(`/companies/${companyId}/workspace/deals`);
  revalidatePath(`/companies/${companyId}/workspace/dashboard`);
  revalidatePath(`/companies/${companyId}/workspace/analytics`);
  revalidatePath("/client/deals");
  revalidatePath("/client/dashboard");
  revalidatePath("/client/analytics");
  revalidatePath("/"); // ダッシュボードの集計もこのタイミングで最新化する
  revalidatePath("/transcripts/new"); // 案件プルダウンにも反映させる
}

export async function deleteDeal(dealId: string): Promise<void> {
  const supabase = createServerClient();

  const { data: existing, error: fetchError } = await supabase
    .from("deals")
    .select("owner_user_id, company_id")
    .eq("id", dealId)
    .single();
  if (fetchError || !existing) {
    throw new Error(`案件情報の取得に失敗しました: ${fetchError?.message ?? ""}`);
  }
  const actor = await assertOwnerOrClientCompany(
    { ownerUserId: existing.owner_user_id, companyId: existing.company_id },
    "案件"
  );

  await supabase.from("action_items").delete().eq("deal_id", dealId);

  const { error } = await supabase.from("deals").delete().eq("id", dealId);
  if (error) {
    throw new Error(`案件削除に失敗しました: ${error.message}`);
  }

  await recordAuditLog({
    userId: userIdOfActor(actor),
    action: "delete",
    targetType: "deal",
    targetId: dealId,
  });

  revalidatePath(`/companies/${existing.company_id}`);
  revalidatePath(`/companies/${existing.company_id}/workspace/deals`);
  revalidatePath(`/companies/${existing.company_id}/workspace/dashboard`);
  revalidatePath(`/companies/${existing.company_id}/workspace/analytics`);
  revalidatePath("/client/deals");
  revalidatePath("/client/dashboard");
  revalidatePath("/client/analytics");
  revalidatePath("/");
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
    if (!formData.has(key)) continue;
    const value = (formData.get(key) as string) || null;
    if (key === "title" && !value) {
      throw new Error("案件名は空にできません。");
    }
    update[key] = value;
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

  revalidatePath(`/companies/${existing.company_id}/workspace/deals`);
  revalidatePath(`/companies/${existing.company_id}/workspace/dashboard`);
  revalidatePath(`/companies/${existing.company_id}/workspace/analytics`);
  revalidatePath("/client/deals");
  revalidatePath("/client/dashboard");
  revalidatePath("/client/analytics");
  revalidatePath(`/companies/${existing.company_id}`);
  revalidatePath("/");
}
