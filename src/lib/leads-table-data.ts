import { createServerClient } from "./supabase";
import { LeadsTableRow } from "@/components/leads-table";

export async function getLeadsTableRows(filter: {
  companyId?: string;
  accessibleCompanyIds?: string[] | null;
}): Promise<LeadsTableRow[]> {
  const supabase = createServerClient();

  let query = supabase
    .from("leads")
    .select("*, deals(title), companies(name)")
    .order("created_at", { ascending: false });
  if (filter.companyId) {
    query = query.eq("company_id", filter.companyId);
  } else if (filter.accessibleCompanyIds) {
    query = query.in("company_id", filter.accessibleCompanyIds);
  }

  const { data, error } = await query;
  if (error) throw new Error(`リード一覧の取得に失敗しました: ${error.message}`);

  return (data ?? []).map((l: any) => ({
    id: l.id,
    companyId: l.company_id,
    companyName: l.companies?.name ?? null,
    convertedFromDealId: l.converted_from_deal_id,
    convertedFromDealTitle: l.deals?.title ?? null,
    lead_company_name: l.lead_company_name,
    approach_list_name: l.approach_list_name,
    last_approach_result: l.last_approach_result,
    last_approach_at: l.last_approach_at,
    activity_summary: l.activity_summary,
    phone: l.phone,
    follow_call_desired: l.follow_call_desired,
    follow_call_summary: l.follow_call_summary,
    email: l.email,
    website_url: l.website_url,
    postal_code: l.postal_code,
    address: l.address,
    material_shipping_destination: l.material_shipping_destination,
    material_request_department: l.material_request_department,
    material_request_contact_name: l.material_request_contact_name,
    lead_source: l.lead_source,
  }));
}
