import type { BrowserContext } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";
import { generateMagicLink, resolveTokensFromActionLink } from "./supabase-admin";

/**
 * 指定メールアドレスのスタッフとして認証済みのCookieをBrowserContextに注入する。
 * アプリ本体が使うのと同じ@supabase/ssrのcreateServerClientでセッションをCookie化することで、
 * 手書きのCookie構築ではなく実際にミドルウェアが認識できる形式を保証する。
 */
export async function loginAsStaff(context: BrowserContext, email: string): Promise<void> {
  const actionLink = await generateMagicLink(email);
  const { access_token, refresh_token } = await resolveTokensFromActionLink(actionLink);

  const collected: { name: string; value: string }[] = [];
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [],
      setAll: (cookiesToSet) => {
        for (const c of cookiesToSet) collected.push({ name: c.name, value: c.value });
      },
    },
  });
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw new Error(`setSession failed: ${error.message}`);

  await context.addCookies(
    collected.map((c) => ({
      name: c.name,
      value: c.value,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
    }))
  );
}
