"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase";
import { recordAuditLog } from "@/lib/audit";
import { assertOwnerOrClientCompany, CurrentActor } from "@/lib/auth";
import { ActionItemStatus } from "@/lib/types";

const ACTION_ITEM_STATUSES: ActionItemStatus[] = ["todo", "in_progress", "done"];

function userIdOfActor(actor: CurrentActor): string | null {
  return actor.type === "staff" ? actor.id : null;
}

function revalidateActionItemPaths(companyId: string): void {
  revalidatePath(`/companies/${companyId}`);
  revalidatePath(`/companies/${companyId}/workspace/deals`);
  revalidatePath(`/companies/${companyId}/workspace/dashboard`);
  revalidatePath("/client/deals");
  revalidatePath("/client/dashboard");
  revalidatePath("/");
}

async function getDealForGuard(supabase: ReturnType<typeof createServerClient>, dealId: string) {
  const { data, error } = await supabase
    .from("deals")
    .select("owner_user_id, company_id")
    .eq("id", dealId)
    .single();
  if (error || !data) {
    throw new Error(`案件情報の取得に失敗しました: ${error?.message ?? ""}`);
  }
  return data;
}

export async function createActionItem(dealId: string, formData: FormData): Promise<void> {
  const title = formData.get("title");
  const dueDate = formData.get("due_date");
  if (typeof title !== "string" || title.trim() === "") {
    throw new Error("アクション内容は必須です。");
  }
  if (typeof dueDate !== "string" || dueDate === "") {
    throw new Error("期日は必須です。");
  }

  const supabase = createServerClient();
  const deal = await getDealForGuard(supabase, dealId);
  const actor = await assertOwnerOrClientCompany(
    { ownerUserId: deal.owner_user_id, companyId: deal.company_id },
    "案件"
  );

  const assigneeId = formData.get("assignee_id");

  const { data, error } = await supabase
    .from("action_items")
    .insert({
      deal_id: dealId,
      title: title.trim(),
      due_date: dueDate,
      assignee_id: (assigneeId as string) || null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`次回アクションの登録に失敗しました: ${error.message}`);
  }

  await recordAuditLog({
    userId: userIdOfActor(actor),
    action: "create",
    targetType: "action_item",
    targetId: data.id,
    detail: { deal_id: dealId },
  });

  revalidateActionItemPaths(deal.company_id);
}

export async function updateActionItemStatus(
  actionItemId: string,
  formData: FormData
): Promise<void> {
  const status = formData.get("status");
  if (typeof status !== "string" || !ACTION_ITEM_STATUSES.includes(status as ActionItemStatus)) {
    throw new Error("ステータスの値が不正です。");
  }

  const supabase = createServerClient();

  const { data: existing, error: fetchError } = await supabase
    .from("action_items")
    .select("deal_id, deals(owner_user_id, company_id)")
    .eq("id", actionItemId)
    .single();
  if (fetchError || !existing) {
    throw new Error(`次回アクションの取得に失敗しました: ${fetchError?.message ?? ""}`);
  }
  const deal = (existing as any).deals;
  const actor = await assertOwnerOrClientCompany(
    { ownerUserId: deal.owner_user_id, companyId: deal.company_id },
    "案件"
  );

  const { error } = await supabase
    .from("action_items")
    .update({ status })
    .eq("id", actionItemId);
  if (error) {
    throw new Error(`ステータスの更新に失敗しました: ${error.message}`);
  }

  await recordAuditLog({
    userId: userIdOfActor(actor),
    action: "update",
    targetType: "action_item",
    targetId: actionItemId,
    detail: { field: "status", to: status },
  });

  revalidateActionItemPaths(deal.company_id);
}

export async function deleteActionItem(actionItemId: string, dealId: string): Promise<void> {
  const supabase = createServerClient();
  const deal = await getDealForGuard(supabase, dealId);
  const actor = await assertOwnerOrClientCompany(
    { ownerUserId: deal.owner_user_id, companyId: deal.company_id },
    "案件"
  );

  const { error } = await supabase.from("action_items").delete().eq("id", actionItemId);
  if (error) {
    throw new Error(`次回アクションの削除に失敗しました: ${error.message}`);
  }

  await recordAuditLog({
    userId: userIdOfActor(actor),
    action: "delete",
    targetType: "action_item",
    targetId: actionItemId,
    detail: { deal_id: dealId },
  });

  revalidateActionItemPaths(deal.company_id);
}
