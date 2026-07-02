import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Server Component / Route Handler / Server Action からログインセッションを
 * 確認・更新するための専用クライアント(anon key)。データ取得には使わないこと
 * (データ取得は引き続き `@/lib/supabase` の service_role クライアントを使う)。
 */
export function createSupabaseSessionClient() {
  const cookieStore = cookies();
  return createSSRServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component からの呼び出しはCookie書き込み不可(読み取り専用)。
          // トークンのリフレッシュ自体はmiddlewareが毎リクエスト行うため無視してよい。
        }
      },
    },
  });
}
