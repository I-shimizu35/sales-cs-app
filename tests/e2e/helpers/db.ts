import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "./env";
import { generateMagicLink, getAuthUserId } from "./supabase-admin";

const headers = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

export async function dbGet<T = unknown>(query: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, { headers });
  return res.json() as Promise<T>;
}

export async function dbInsert<T = Record<string, unknown>>(
  table: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`insert into ${table} failed: ${JSON.stringify(data)}`);
  return (Array.isArray(data) ? data[0] : data) as T;
}

export async function dbPatch(query: string, body: Record<string, unknown>): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  return res.status;
}

export async function dbDelete(query: string): Promise<number> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, { method: "DELETE", headers });
  return res.status;
}

/** テストで作成する企業名にはこの接頭辞を必ず付け、グローバルteardownで一括削除できるようにする。 */
export const TEST_PREFIX = "E2E_";

export async function createTestCompany(
  label: string,
  extra: Record<string, unknown> = {}
): Promise<{ id: string; name: string }> {
  return dbInsert("companies", {
    name: `${TEST_PREFIX}${label}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    industry: "E2Eテスト",
    support_status: "active",
    ...extra,
  });
}

export async function cleanupTestCompanies(): Promise<void> {
  const companies = await dbGet<{ id: string }[]>(
    `companies?name=like.${TEST_PREFIX}*&select=id`
  );
  for (const c of companies) {
    const deals = await dbGet<{ id: string }[]>(`deals?company_id=eq.${c.id}&select=id`);
    for (const d of deals) {
      await dbDelete(`action_items?deal_id=eq.${d.id}`);
    }
    await dbDelete(`leads?company_id=eq.${c.id}`);
    await dbDelete(`deals?company_id=eq.${c.id}`);
    await dbDelete(`company_supporters?company_id=eq.${c.id}`);
    await dbDelete(`company_notes?company_id=eq.${c.id}`);
    await dbDelete(`audit_logs?target_id=eq.${c.id}`);
    await dbDelete(`companies?id=eq.${c.id}`);
  }
}

/**
 * 固定メールアドレスのE2Eテスト用スタッフユーザーを冪等に用意する。
 * 既に存在すればそれを返し、なければAuth ID作成(magic link発行)→usersテーブルへ登録の順で作る
 * (先にusersへ問い合わせるとauth_user_idがまだ存在せずリンクが空振りするため、順序が重要)。
 */
export async function ensureTestStaffUser(
  email: string,
  role: string
): Promise<{ id: string; email: string }> {
  const existing = await dbGet<{ id: string; email: string }[]>(
    `users?email=eq.${encodeURIComponent(email)}&select=id,email`
  );
  if (existing.length > 0) return existing[0];

  await generateMagicLink(email);
  const authUserId = await getAuthUserId(email);

  return dbInsert("users", {
    email,
    name: `E2E ${role} テストユーザー`,
    role,
    status: "active",
    auth_user_id: authUserId,
  });
}
