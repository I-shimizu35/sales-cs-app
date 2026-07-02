import { createServerClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { CompanyListClient, CompanyWithOwner } from "./company-list-client";

export const dynamic = "force-dynamic";

async function getCompanies(): Promise<CompanyWithOwner[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("companies")
    // companiesはusersへ owner_user_id / created_by の2つのFKを持つため、
    // どちらの関係を埋め込むか明示しないとPostgRESTが曖昧としてエラーを返す
    .select("*, owner:users!companies_owner_user_id_fkey(name)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`企業一覧の取得に失敗しました: ${error.message}`);
  }
  return data as unknown as CompanyWithOwner[];
}

async function getSupporterNamesByCompany(): Promise<Record<string, string[]>> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("company_supporters").select("company_id, users(name)");
  if (error) throw new Error(`支援担当者の取得に失敗しました: ${error.message}`);

  const result: Record<string, string[]> = {};
  for (const s of (data ?? []) as any[]) {
    const name = s.users?.name;
    if (!name) continue;
    if (!result[s.company_id]) result[s.company_id] = [];
    result[s.company_id].push(name);
  }
  return result;
}

export default async function CompaniesPage() {
  const [companies, currentUser, supporterNamesByCompany] = await Promise.all([
    getCompanies(),
    getCurrentUser(),
    getSupporterNamesByCompany(),
  ]);
  // 全ロールが企業を新規登録できる(cs/sales/supportは自分がownerとして自動登録される)
  const canCreateCompany = currentUser !== null;
  return (
    <CompanyListClient
      companies={companies}
      canCreateCompany={canCreateCompany}
      supporterNamesByCompany={supporterNamesByCompany}
    />
  );
}
