import { headers } from "next/headers";
import { UserRole } from "./types";

/**
 * middlewareが検証済みのユーザー情報(x-app-user-id / x-app-user-role)を
 * リクエストヘッダから読み取るだけの軽量ヘルパー。DBへの再問い合わせは行わない。
 */
export interface CurrentUser {
  id: string;
  role: UserRole;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const h = headers();
  const id = h.get("x-app-user-id");
  const role = h.get("x-app-user-role") as UserRole | null;
  return id && role ? { id, role } : null;
}

export async function getCurrentUserId(): Promise<string | null> {
  return (await getCurrentUser())?.id ?? null;
}

export function isManagerOrAdmin(role: UserRole): boolean {
  return role === "admin" || role === "manager";
}

export async function requireAdminOrManager(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || !isManagerOrAdmin(user.role)) {
    throw new Error("この操作には管理者またはマネージャー権限が必要です。");
  }
  return user;
}

/**
 * 対象レコード(企業・案件)のowner_user_idに対する編集権限をチェックする。
 * admin/managerは無条件に許可、それ以外はowner本人のみ許可する。
 */
export async function assertOwnerOrManager(
  ownerUserId: string | null,
  label: string
): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("認証が必要です。");
  }
  if (isManagerOrAdmin(user.role)) {
    return user;
  }
  if (ownerUserId !== user.id) {
    throw new Error(`この${label}を編集する権限がありません(担当者本人のみ編集できます)。`);
  }
  return user;
}

/**
 * クライアントポータル(companies.client_password_hashでログインする顧客企業)向けの
 * 軽量アクター情報。Supabase Authとは別経路(middlewareがx-client-company-idヘッダを注入)。
 */
export interface CurrentClient {
  companyId: string;
}

export async function getCurrentClient(): Promise<CurrentClient | null> {
  const h = headers();
  const companyId = h.get("x-client-company-id");
  return companyId ? { companyId } : null;
}

export type CurrentActor =
  | ({ type: "staff" } & CurrentUser)
  | ({ type: "client" } & CurrentClient);

export async function getCurrentActor(): Promise<CurrentActor | null> {
  const user = await getCurrentUser();
  if (user) return { type: "staff", ...user };
  const client = await getCurrentClient();
  if (client) return { type: "client", ...client };
  return null;
}

/**
 * 現在のスタッフが閲覧・操作できる企業IDの一覧を返す。
 * admin/managerはnull(=全件アクセス可)を返す。それ以外はowner_user_idが一致する企業のみ。
 * 文字起こし・AI生成・生成履歴など、企業横断で一覧表示する画面のスコープ制御に使う。
 */
export async function getAccessibleCompanyIds(
  supabase: import("@supabase/supabase-js").SupabaseClient
): Promise<string[] | null> {
  const user = await getCurrentUser();
  if (!user) return [];
  if (isManagerOrAdmin(user.role)) return null;

  const { data, error } = await supabase.from("companies").select("id").eq("owner_user_id", user.id);
  if (error) throw new Error(`アクセス可能な企業の取得に失敗しました: ${error.message}`);
  return (data ?? []).map((c) => c.id);
}

/**
 * deals/leadsなど「社内担当者(owner_user_id) or 自社データを閲覧するクライアント(company_id一致)」
 * のどちらからも編集され得るレコード用の権限チェック。
 * 社内側の判定基準は既存のassertOwnerOrManagerと同じ(admin/manager無条件、それ以外はowner本人のみ)。
 */
export async function assertOwnerOrClientCompany(
  record: { ownerUserId: string | null; companyId: string },
  label: string
): Promise<CurrentActor> {
  const actor = await getCurrentActor();
  if (!actor) {
    throw new Error("認証が必要です。");
  }
  if (actor.type === "staff") {
    if (isManagerOrAdmin(actor.role) || record.ownerUserId === actor.id) {
      return actor;
    }
    throw new Error(`この${label}を編集する権限がありません(担当者本人のみ編集できます)。`);
  }
  if (actor.companyId !== record.companyId) {
    throw new Error(`この${label}を編集する権限がありません。`);
  }
  return actor;
}
