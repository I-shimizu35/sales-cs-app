import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "./env";

const adminHeaders = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

/**
 * Google OAuthは自動化できないため、Supabase Admin APIでmagiclinkを発行し、
 * その検証リンクをサーバー側で直接踏むことでアクセストークンを得る(実ブラウザは使わない)。
 * これはアプリ本体のログイン経路(OAuth PKCE)とは別だが、GoTrueが発行する
 * セッションとしては同一であり、実際のCookieを@supabase/ssrでそのまま組み立てて使う。
 */
export async function generateMagicLink(email: string): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ type: "magiclink", email }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`generate_link failed: ${res.status} ${JSON.stringify(data)}`);
  return data.properties?.action_link ?? data.action_link;
}

export async function resolveTokensFromActionLink(
  actionLink: string
): Promise<{ access_token: string; refresh_token: string }> {
  const res = await fetch(actionLink, { redirect: "manual" });
  const location = res.headers.get("location");
  if (!location) throw new Error(`no redirect location; status=${res.status}`);
  const hashIdx = location.indexOf("#");
  if (hashIdx === -1) throw new Error(`redirect had no hash fragment: ${location}`);
  const params = new URLSearchParams(location.slice(hashIdx + 1));
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token) throw new Error(`missing tokens in fragment: ${location}`);
  return { access_token, refresh_token };
}

export async function getAuthUserId(email: string): Promise<string | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
    headers: adminHeaders,
  });
  const data = await res.json();
  const user = (data.users ?? []).find((u: { email?: string }) => u.email === email);
  return user?.id ?? null;
}
