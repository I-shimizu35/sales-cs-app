"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { recordAuditLog } from "@/lib/audit";
import {
  getCurrentUser,
  getCurrentUserId,
  isManagerOrAdmin,
  assertOwnerOrManager,
  requireAdminOrManager,
} from "@/lib/auth";

export interface ClientPortalCredentials {
  loginUrl: string;
  password: string;
}

/**
 * クライアントポータルの専用ログインURL(slug)と初期パスワードを再生成して有効化する。
 * 実行の都度、古いURL・パスワードは無効になる(単純化のため再発行=ローテーションとする)。
 * パスワードは平文で保存しないためこの関数の戻り値でのみ確認できる。
 */
export async function enableClientPortal(companyId: string): Promise<ClientPortalCredentials> {
  await requireAdminOrManager();

  const slug = crypto.randomBytes(6).toString("base64url");
  const password = crypto.randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 10);

  const supabase = createServerClient();
  const { error } = await supabase
    .from("companies")
    .update({
      client_login_slug: slug,
      client_password_hash: passwordHash,
      client_portal_enabled: true,
    })
    .eq("id", companyId);
  if (error) {
    throw new Error(`クライアントポータルの有効化に失敗しました: ${error.message}`);
  }

  const userId = await getCurrentUserId();
  await recordAuditLog({
    userId,
    action: "update",
    targetType: "company",
    targetId: companyId,
    detail: { field: "client_portal" },
  });

  const host = headers().get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const loginUrl = `${protocol}://${host}/client/login?c=${slug}`;

  revalidatePath(`/companies/${companyId}`);
  return { loginUrl, password };
}

export async function disableClientPortal(companyId: string): Promise<void> {
  await requireAdminOrManager();

  const supabase = createServerClient();
  const { error } = await supabase
    .from("companies")
    .update({ client_portal_enabled: false })
    .eq("id", companyId);
  if (error) {
    throw new Error(`クライアントポータルの無効化に失敗しました: ${error.message}`);
  }

  revalidatePath(`/companies/${companyId}`);
}

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
  const currentUser = await getCurrentUser();
  const userId = currentUser?.id ?? null;

  const { data: existing, error: fetchError } = await supabase
    .from("companies")
    .select("owner_user_id")
    .eq("id", companyId)
    .single();
  if (fetchError || !existing) {
    throw new Error(`企業情報の取得に失敗しました: ${fetchError?.message ?? ""}`);
  }
  await assertOwnerOrManager(existing.owner_user_id, "企業");

  // admin/manager以外はowner_user_idを変更できない(フォームのselectもdisabledで送信されないため)。
  // admin/managerであっても、フィールド自体が送信されていない場合は既存値を維持する
  // (フォーム欠落や直接API呼び出しで担当者が意図せず外れてロックアウトされるのを防ぐ)。
  const resolvedOwnerUserId =
    currentUser && !isManagerOrAdmin(currentUser.role)
      ? existing.owner_user_id
      : formData.has("owner_user_id")
        ? (formData.get("owner_user_id") as string) || null
        : existing.owner_user_id;

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
      owner_user_id: resolvedOwnerUserId,
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

export async function updateSupportStatus(companyId: string, formData: FormData): Promise<void> {
  const status = formData.get("support_status");
  if (status !== "active" && status !== "inactive") {
    throw new Error("支援ステータスの値が不正です。");
  }

  const supabase = createServerClient();
  const { data: existing, error: fetchError } = await supabase
    .from("companies")
    .select("owner_user_id")
    .eq("id", companyId)
    .single();
  if (fetchError || !existing) {
    throw new Error(`企業情報の取得に失敗しました: ${fetchError?.message ?? ""}`);
  }
  await assertOwnerOrManager(existing.owner_user_id, "企業");

  const { error } = await supabase.from("companies").update({ support_status: status }).eq("id", companyId);
  if (error) {
    throw new Error(`支援ステータスの更新に失敗しました: ${error.message}`);
  }

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/");
}

export async function addSupporter(companyId: string, formData: FormData): Promise<void> {
  const userId = formData.get("user_id");
  if (typeof userId !== "string" || !userId) {
    throw new Error("担当者を選択してください。");
  }

  const supabase = createServerClient();
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
    .from("company_supporters")
    .insert({ company_id: companyId, user_id: userId });
  if (error && error.code !== "23505") {
    // 23505 = unique制約違反(既にアサイン済み)は無視する
    throw new Error(`支援担当者の追加に失敗しました: ${error.message}`);
  }

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/");
}

export async function removeSupporter(supporterId: string, companyId: string): Promise<void> {
  const supabase = createServerClient();
  const { data: existing, error: fetchError } = await supabase
    .from("companies")
    .select("owner_user_id")
    .eq("id", companyId)
    .single();
  if (fetchError || !existing) {
    throw new Error(`企業情報の取得に失敗しました: ${fetchError?.message ?? ""}`);
  }
  await assertOwnerOrManager(existing.owner_user_id, "企業");

  const { error } = await supabase.from("company_supporters").delete().eq("id", supporterId);
  if (error) {
    throw new Error(`支援担当者の削除に失敗しました: ${error.message}`);
  }

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/");
}
