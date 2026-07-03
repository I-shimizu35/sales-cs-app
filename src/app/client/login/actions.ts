"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import {
  createClientSessionCookieValue,
  CLIENT_SESSION_COOKIE_NAME,
  CLIENT_SESSION_MAX_AGE_SECONDS,
} from "@/lib/client-session";
import { sendNotificationEmail } from "@/lib/notifications";
import { recordAuditLog } from "@/lib/audit";

export async function verifyClientLogin(formData: FormData): Promise<void> {
  const slug = formData.get("slug");
  const password = formData.get("password");
  if (typeof slug !== "string" || !slug || typeof password !== "string" || !password) {
    throw new Error("ログイン情報が不正です。発行されたURLからアクセスしてください。");
  }

  const supabase = createServerClient();
  const { data: company } = await supabase
    .from("companies")
    .select("id, client_password_hash, client_portal_enabled")
    .eq("client_login_slug", slug)
    .maybeSingle();

  if (!company || !company.client_portal_enabled || !company.client_password_hash) {
    throw new Error("ログインに失敗しました。URLまたはパスワードをご確認ください。");
  }

  const matches = await bcrypt.compare(password, company.client_password_hash);
  if (!matches) {
    throw new Error("ログインに失敗しました。URLまたはパスワードをご確認ください。");
  }

  const cookieValue = await createClientSessionCookieValue(company.id);
  cookies().set(CLIENT_SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CLIENT_SESSION_MAX_AGE_SECONDS,
  });

  redirect("/client");
}

export async function logoutClient(): Promise<void> {
  cookies().delete(CLIENT_SESSION_COOKIE_NAME);
  redirect("/client/login");
}

/**
 * クライアントは共有パスワードを自分でリセットできない(本人確認手段がないため)ので、
 * 「担当スタッフに再発行を依頼する」通知を送るだけの一方向フロー。
 * 実際の再発行(新パスワード発行)は/companies/[id]のクライアントポータルパネルから
 * スタッフが行う。company_idが不明な状態からでも呼べるよう常に成功扱いで返す
 * (存在しないslugを試行して企業の有無を探索されるのを防ぐため)。
 */
export async function requestClientPasswordReset(slug: string): Promise<void> {
  if (!slug) return;

  const supabase = createServerClient();
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, owner_user_id")
    .eq("client_login_slug", slug)
    .eq("client_portal_enabled", true)
    .maybeSingle();

  if (!company) return;

  const staffIds = new Set<string>();
  if (company.owner_user_id) staffIds.add(company.owner_user_id);
  const { data: supporters } = await supabase
    .from("company_supporters")
    .select("user_id")
    .eq("company_id", company.id);
  for (const s of supporters ?? []) staffIds.add(s.user_id);

  let recipients: { email: string }[] = [];
  if (staffIds.size > 0) {
    const { data } = await supabase.from("users").select("email").in("id", Array.from(staffIds));
    recipients = data ?? [];
  } else {
    // 担当者未設定の場合、依頼が誰にも届かず放置されるのを避けるため管理者全員に送る
    const { data } = await supabase.from("users").select("email").eq("role", "admin").eq("status", "active");
    recipients = data ?? [];
  }

  for (const r of recipients) {
    await sendNotificationEmail({
      to: r.email,
      subject: `【${company.name}】クライアントよりパスワード再発行のリクエストがありました`,
      body: `${company.name} のクライアントポータルログイン画面から、パスワード再発行のリクエストがありました。\n\n企業詳細ページの「クライアントポータル」から再発行し、新しいURL・パスワードをクライアントへご連絡ください。\n\n※本メールは自動送信です。`,
    });
  }

  await recordAuditLog({
    userId: null,
    action: "create",
    targetType: "company",
    targetId: company.id,
    detail: { event: "client_password_reset_requested" },
  });
}
