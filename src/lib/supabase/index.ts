import { createBrowserClient as createSSRBrowserClient } from "@supabase/ssr";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // 起動時に気づけるよう、フォールバックせず明示的にエラーを投げる
  throw new Error(
    "Supabaseの環境変数が設定されていません。.env.localにNEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEYを設定してください。"
  );
}

/**
 * ブラウザ/クライアントコンポーネントから使う用。
 * セッションをCookie経由で保存するため、middleware/Server Componentからも参照できる
 * (localStorage保存の素のcreateClientだとサーバー側からセッションを読めないため@supabase/ssrを使う)。
 */
export function createBrowserClient() {
  return createSSRBrowserClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
}

/**
 * サーバー(API Route / Server Action)専用。service_role keyはRLSを
 * バイパスするため、絶対にクライアントバンドルに含めないこと。
 * このファイルは "use server" 環境からのみ import すること。
 */
export function createServerClient(): SupabaseClient {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEYが設定されていません。.env.localを確認してください。"
    );
  }
  return createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}
