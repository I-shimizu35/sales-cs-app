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
