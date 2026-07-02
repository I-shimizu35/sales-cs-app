import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase";
import { Company, Deal, GeneratedReport, AppUser, ActionItem } from "@/lib/types";
import { getCurrentUser, isManagerOrAdmin } from "@/lib/auth";
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

async function getDeals(companyId: string): Promise<Deal[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`案件一覧の取得に失敗しました: ${error.message}`);
  return data as Deal[];
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

async function getActionItems(dealIds: string[]): Promise<ActionItem[]> {
  if (dealIds.length === 0) return [];
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("action_items")
    .select("*")
    .in("deal_id", dealIds)
    .order("due_date", { ascending: true });
  if (error) throw new Error(`次回アクションの取得に失敗しました: ${error.message}`);
  return data as ActionItem[];
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

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { saved?: string };
}) {
  const company = await getCompany(params.id);
  if (!company) notFound();

  const [deals, generatedReports, users, currentUser, supporters] = await Promise.all([
    getDeals(company.id),
    getGeneratedReports(company.id),
    getUsers(),
    getCurrentUser(),
    getSupporters(company.id),
  ]);
  const actionItems = await getActionItems(deals.map((d) => d.id));

  const canEditCompany =
    !!currentUser &&
    (isManagerOrAdmin(currentUser.role) || company.owner_user_id === currentUser.id);

  return (
    <CompanyDetailClient
      company={company}
      deals={deals}
      generatedReports={generatedReports}
      users={users}
      actionItems={actionItems}
      supporters={supporters}
      currentUserId={currentUser?.id ?? null}
      canEditCompany={canEditCompany}
      isManagerOrAdmin={!!currentUser && isManagerOrAdmin(currentUser.role)}
      initialSaved={searchParams.saved === "1"}
    />
  );
}
