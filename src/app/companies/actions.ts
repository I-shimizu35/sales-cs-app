"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { recordAuditLog } from "@/lib/audit";
import { getCurrentUser, getCurrentUserId, isManagerOrAdmin, assertOwnerOrManager } from "@/lib/auth";

export async function createCompany(formData: FormData): Promise<void> {
  const name = formData.get("name");
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error("会社名は必須です。");
  }

  const supabase = createServerClient();
  const currentUser = await getCurrentUser();
  const userId = currentUser?.id ?? null;
  const ownerUserId = formData.get("owner_user_id");

  // admin/manager以外は、フォームの指定に関わらず自分自身をownerとして登録する
  // (cs/sales/supportは自分がownerの企業のみ編集できるため、作成時点で自分を担当者にする)
  const resolvedOwnerUserId =
    currentUser && !isManagerOrAdmin(currentUser.role)
      ? currentUser.id
      : (ownerUserId as string) || null;

  const { data, error } = await supabase
    .from("companies")
    .insert({
      name: name.trim(),
      url: formData.get("url") || null,
      industry: formData.get("industry") || null,
      business_summary: formData.get("business_summary") || null,
      current_issues: formData.get("current_issues") || null,
      goals: formData.get("goals") || null,
      created_by: userId,
      owner_user_id: resolvedOwnerUserId,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`企業登録に失敗しました: ${error.message}`);
  }

  await recordAuditLog({
    userId,
    action: "create",
    targetType: "company",
    targetId: data.id,
  });

  revalidatePath("/companies");
  redirect(`/companies/${data.id}`);
}

export async function updateCompany(companyId: string, formData: FormData): Promise<void> {
  const supabase = createServerClient();
  const userId = await getCurrentUserId();

  const { data: existing, error: fetchError } = await supabase
    .from("companies")
    .select("owner_user_id")
    .eq("id", companyId)
    .single();
  if (fetchError || !existing) {
    throw new Error(`企業情報の取得に失敗しました: ${fetchError?.message ?? ""}`);
  }
  await assertOwnerOrManager(existing.owner_user_id, "企業");

  const { error } = await supabase
    .from("companies")
    .update({
      name: formData.get("name"),
      url: formData.get("url") || null,
      industry: formData.get("industry") || null,
      location: formData.get("location") || null,
      business_summary: formData.get("business_summary") || null,
      support_purpose: formData.get("support_purpose") || null,
      current_issues: formData.get("current_issues") || null,
      goals: formData.get("goals") || null,
      owner_user_id: (formData.get("owner_user_id") as string) || null,
    })
    .eq("id", companyId);

  if (error) {
    throw new Error(`企業情報の更新に失敗しました: ${error.message}`);
  }

  await recordAuditLog({
    userId,
    action: "update",
    targetType: "company",
    targetId: companyId,
  });

  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}?saved=1`);
}
