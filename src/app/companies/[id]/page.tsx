import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { Company, GeneratedReport, AppUser, CompanyNote } from "@/lib/types";
import { getCurrentUser, isManagerOrAdmin } from "@/lib/auth";
import { getLeadsTableRows } from "@/lib/leads-table-data";
import { CompanyDetailClient } from "./company-detail-client";

export const dynamic = "force-dynamic";

async function getCompany(id: string): Promise<Company | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("companies").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`企業情報の取得に失敗しました: ${error.message}`);
  }
  return data as Company;
}

async function getGeneratedReports(companyId: string): Promise<GeneratedReport[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("generated_reports")
    .select("*")
    .eq("target_type", "company")
    .eq("target_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`生成履歴の取得に失敗しました: ${error.message}`);
  return data as GeneratedReport[];
}

async function getUsers(): Promise<AppUser[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("users").select("*").order("name");
  if (error) throw new Error(`ユーザー一覧の取得に失敗しました: ${error.message}`);
  return data as AppUser[];
}

interface SupporterRow {
  id: string;
  user_id: string;
}

async function getSupporters(companyId: string): Promise<SupporterRow[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("company_supporters")
    .select("id, user_id")
    .eq("company_id", companyId);
  if (error) throw new Error(`支援担当者の取得に失敗しました: ${error.message}`);
  return data as SupporterRow[];
}

async function getNotes(companyId: string): Promise<CompanyNote[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("company_notes")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`メモの取得に失敗しました: ${error.message}`);
  return data as CompanyNote[];
}

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string; new?: string };
}) {
  const company = await getCompany(params.id);
  if (!company) notFound();

  const [generatedReports, users, currentUser, supporters, notes, leads] = await Promise.all([
    getGeneratedReports(company.id),
    getUsers(),
    getCurrentUser(),
    getSupporters(company.id),
    getNotes(company.id),
    getLeadsTableRows({ companyId: company.id }),
  ]);

  const canEditCompany =
    !!currentUser &&
    (isManagerOrAdmin(currentUser.role) || company.owner_user_id === currentUser.id);

  const userNameById: Record<string, string> = {};
  for (const u of users) userNameById[u.id] = u.name;

  return (
    <CompanyDetailClient
      company={company}
      generatedReports={generatedReports}
      users={users}
      supporters={supporters}
      notes={notes}
      leads={leads}
      userNameById={userNameById}
      currentUserId={currentUser?.id ?? null}
      canEditCompany={canEditCompany}
      isManagerOrAdmin={!!currentUser && isManagerOrAdmin(currentUser.role)}
      initialSaved={searchParams.saved === "1"}
      isNewlyCreated={searchParams.new === "1"}
    />
  );
}
