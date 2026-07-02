import { NextRequest, NextResponse } from "next/server";
import { createSupabaseSessionClient } from "@/lib/supabase/server";
import { createServerClient } from "@/lib/supabase";

/**
 * Google OAuth(PKCEフロー)のコールバック。セッション確立に成功したら、
 * メールアドレスが一致する未紐付けのusersレコードを自動的にリンクする
 * (運用フロー: 管理者が先にメールアドレス+ロールを登録 → 本人がログイン → 自動リンク)。
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const sessionClient = createSupabaseSessionClient();
    const { data, error } = await sessionClient.auth.exchangeCodeForSession(code);

    if (!error && data.user?.email) {
      const adminClient = createServerClient();
      const { data: existing } = await adminClient
        .from("users")
        .select("id")
        .ilike("email", data.user.email)
        .is("auth_user_id", null)
        .maybeSingle();

      if (existing) {
        await adminClient
          .from("users")
          .update({ auth_user_id: data.user.id })
          .eq("id", existing.id);
      }
    }
  }

  return NextResponse.redirect(`${origin}/`);
}
