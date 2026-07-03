"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase";
import { requireAdminOrManager } from "@/lib/auth";
import { recordAuditLog } from "@/lib/audit";
import { UserRole } from "@/lib/types";

const ROLES: UserRole[] = ["admin", "manager", "cs", "sales", "support"];

export async function createUser(formData: FormData): Promise<void> {
  await requireAdminOrManager();

  const name = formData.get("name");
  const email = formData.get("email");
  const role = formData.get("role");

  if (typeof name !== "string" || name.trim() === "") {
    throw new Error("氏名は必須です。");
  }
  if (typeof email !== "string" || email.trim() === "") {
    throw new Error("メールアドレスは必須です。");
  }
  if (typeof role !== "string" || !ROLES.includes(role as UserRole)) {
    throw new Error("ロールが不正です。");
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("users").insert({
    name: name.trim(),
    email: email.trim(),
    role,
  });

  if (error) {
    throw new Error(`ユーザー登録に失敗しました: ${error.message}`);
  }

  // ユーザー一覧に加え、担当者選択欄を持つ画面もまとめて再検証する
  revalidatePath("/admin/users");
  revalidatePath("/companies/new");
  revalidatePath("/companies", "layout");
}

export async function updateUserRole(userId: string, formData: FormData): Promise<void> {
  const currentUser = await requireAdminOrManager();
  if (userId === currentUser.id) {
    throw new Error("自分自身のロールは変更できません。他の管理者に依頼してください。");
  }

  const role = formData.get("role");
  if (typeof role !== "string" || !ROLES.includes(role as UserRole)) {
    throw new Error("ロールが不正です。");
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("users").update({ role }).eq("id", userId);
  if (error) {
    throw new Error(`ロールの更新に失敗しました: ${error.message}`);
  }

  await recordAuditLog({
    userId: currentUser.id,
    action: "update",
    targetType: "user",
    targetId: userId,
    detail: { field: "role", to: role },
  });

  revalidatePath("/admin/users");
}

export async function updateUserStatus(userId: string, formData: FormData): Promise<void> {
  const currentUser = await requireAdminOrManager();
  if (userId === currentUser.id) {
    throw new Error("自分自身のステータスは変更できません。他の管理者に依頼してください。");
  }

  const status = formData.get("status");
  if (typeof status !== "string" || !["active", "inactive"].includes(status)) {
    throw new Error("ステータスが不正です。");
  }

  const supabase = createServerClient();
  const { error } = await supabase.from("users").update({ status }).eq("id", userId);
  if (error) {
    throw new Error(`ステータスの更新に失敗しました: ${error.message}`);
  }

  await recordAuditLog({
    userId: currentUser.id,
    action: "update",
    targetType: "user",
    targetId: userId,
    detail: { field: "status", to: status },
  });

  revalidatePath("/admin/users");
}
