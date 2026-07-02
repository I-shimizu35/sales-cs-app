"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase";
import { recordAuditLog } from "@/lib/audit";
import { assertOwnerOrManager, assertOwnerOrClientCompany, getCurrentActor } from "@/lib/auth";

const EDITABLE_TEXT_FIELDS = [
  "lead_company_name",
  "approach_list_name",
  "last_approach_result",
  "activity_summary",
  "phone",
  "follow_call_summary",
  "email",
  "website_url",
  "postal_code",
  "address",
  "material_shipping_destination",
  "material_request_department",
  "material_request_contact_name",
  "lead_source",
] as const;
const EDITABLE_DATETIME_FIELDS = ["last_approach_at"] as const;

export async function createLead(formData: FormData): Promise<void> {
  const leadCompanyName = formData.get("lead_company_name");
  const companyId = formData.get("company_id");
  if (typeof leadCompanyName !== "string" || leadCompanyName.trim() === "") {
    throw new Error("企業名は必須です。");
  }
  if (typeof companyId !== "string" || !companyId) {
    throw new Error("クライアント企業を選択してください。");
  }

  const actor = await getCurrentActor();
  if (!actor) {
    throw new Error("認証が必要です。");
  }

  const supabase = createServerClient();

  if (actor.type === "staff") {
    const { data: company, error } = await supabase
      .from("companies")
      .select("owner_user_id")
      .eq("id", companyId)
      .single();
    if (error || !company) {
      throw new Error(`企業情報の取得に失敗しました: ${error?.message ?? ""}`);
    }
    await assertOwnerOrManager(company.owner_user_id, "企業");
  } else if (actor.companyId !== companyId) {
    throw new Error("この企業のリードは登録できません。");
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({
      company_id: companyId,
      lead_company_name: leadCompanyName.trim(),
      owner_user_id: actor.type === "staff" ? actor.id : null,
    })
    .select("id")
    .single();
  if (error) {
    throw new Error(`リード登録に失敗しました: ${error.message}`);
  }

  await recordAuditLog({
    userId: actor.type === "staff" ? actor.id : null,
    action: "create",
    targetType: "lead",
    targetId: data.id,
  });

  revalidatePath(`/companies/${companyId}/workspace/leads`);
  revalidatePath("/client/leads");
}

export async function updateLeadFields(leadId: string, formData: FormData): Promise<void> {
  const supabase = createServerClient();
  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("owner_user_id, company_id")
    .eq("id", leadId)
    .single();
  if (fetchError || !existing) {
    throw new Error(`リード情報の取得に失敗しました: ${fetchError?.message ?? ""}`);
  }

  const actor = await assertOwnerOrClientCompany(
    { ownerUserId: existing.owner_user_id, companyId: existing.company_id },
    "リード"
  );

  const update: Record<string, unknown> = {};
  for (const key of EDITABLE_TEXT_FIELDS) {
    if (formData.has(key)) update[key] = (formData.get(key) as string) || null;
  }
  for (const key of EDITABLE_DATETIME_FIELDS) {
    if (formData.has(key)) update[key] = (formData.get(key) as string) || null;
  }
  if (formData.has("follow_call_desired")) {
    const raw = formData.get("follow_call_desired");
    update.follow_call_desired = raw === "" ? null : raw === "true";
  }

  if (Object.keys(update).length === 0) return;

  const { error } = await supabase.from("leads").update(update).eq("id", leadId);
  if (error) {
    throw new Error(`リード情報の更新に失敗しました: ${error.message}`);
  }

  await recordAuditLog({
    userId: actor.type === "staff" ? actor.id : null,
    action: "update",
    targetType: "lead",
    targetId: leadId,
    detail: { fields: Object.keys(update) },
  });

  revalidatePath(`/companies/${existing.company_id}/workspace/leads`);
  revalidatePath("/client/leads");
}

export async function deleteLead(leadId: string): Promise<void> {
  const supabase = createServerClient();
  const { data: existing, error: fetchError } = await supabase
    .from("leads")
    .select("owner_user_id, company_id")
    .eq("id", leadId)
    .single();
  if (fetchError || !existing) {
    throw new Error(`リード情報の取得に失敗しました: ${fetchError?.message ?? ""}`);
  }

  await assertOwnerOrClientCompany(
    { ownerUserId: existing.owner_user_id, companyId: existing.company_id },
    "リード"
  );

  const { error } = await supabase.from("leads").delete().eq("id", leadId);
  if (error) {
    throw new Error(`リード削除に失敗しました: ${error.message}`);
  }

  revalidatePath(`/companies/${existing.company_id}/workspace/leads`);
  revalidatePath("/client/leads");
}
