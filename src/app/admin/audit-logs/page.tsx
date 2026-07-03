import { Suspense } from "react";
import { createServerClient } from "@/lib/supabase";
import { AuditLogSearchClient } from "./audit-log-search-client";
import { AuditLogList, AuditLogItem } from "./audit-log-list";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

interface RawAuditLog {
  id: string;
  user_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  detail: Record<string, unknown> | null;
  created_at: string;
}

interface SearchParams {
  userId?: string;
  action?: string;
  targetType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
}

function applyFilters<T>(query: T, params: SearchParams): T {
  let q = query as any;
  if (params.userId) q = q.eq("user_id", params.userId);
  if (params.action) q = q.eq("action", params.action);
  if (params.targetType) q = q.eq("target_type", params.targetType);
  if (params.dateFrom) q = q.gte("created_at", `${params.dateFrom}T00:00:00`);
  if (params.dateTo) q = q.lte("created_at", `${params.dateTo}T23:59:59`);
  return q;
}

async function getAuditLogs(
  params: SearchParams
): Promise<{ logs: RawAuditLog[]; total: number; page: number; pageCount: number }> {
  const supabase = createServerClient();
  const requestedPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const countQuery = applyFilters(supabase.from("audit_logs").select("id", { count: "exact", head: true }), params);
  const { count: totalCount, error: countError } = await countQuery;
  if (countError) throw new Error(`操作履歴の取得に失敗しました: ${countError.message}`);

  const total = totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);

  if (total === 0) {
    return { logs: [], total: 0, page: 1, pageCount: 1 };
  }

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const dataQuery = applyFilters(
    supabase
      .from("audit_logs")
      .select("id, user_id, action, target_type, target_id, detail, created_at")
      .order("created_at", { ascending: false })
      .range(from, to),
    params
  );
  const { data, error } = await dataQuery;
  if (error) throw new Error(`操作履歴の取得に失敗しました: ${error.message}`);

  return { logs: (data ?? []) as RawAuditLog[], total, page, pageCount };
}

/**
 * target_type が company/deal/lead の場合のみ、表示用ラベル(企業名等)を逆引きする。
 * それ以外(user/prompt/action_item/transcript等)はtarget_idをそのまま表示する。
 */
async function resolveTargetLabels(
  logs: RawAuditLog[]
): Promise<Record<string, { label: string; companyId: string | null }>> {
  const supabase = createServerClient();
  const result: Record<string, { label: string; companyId: string | null }> = {};

  const companyIds = logs.filter((l) => l.target_type === "company").map((l) => l.target_id);
  const dealIds = logs.filter((l) => l.target_type === "deal").map((l) => l.target_id);
  const leadIds = logs.filter((l) => l.target_type === "lead").map((l) => l.target_id);

  const companyMap: Record<string, string> = {};
  if (companyIds.length > 0 || dealIds.length > 0 || leadIds.length > 0) {
    const { data: dealRows } = dealIds.length
      ? await supabase.from("deals").select("id, title, company_id").in("id", dealIds)
      : { data: [] as { id: string; title: string; company_id: string }[] };
    const { data: leadRows } = leadIds.length
      ? await supabase.from("leads").select("id, lead_company_name, company_id").in("id", leadIds)
      : { data: [] as { id: string; lead_company_name: string; company_id: string }[] };

    const allCompanyIds = Array.from(
      new Set([...companyIds, ...(dealRows ?? []).map((d) => d.company_id), ...(leadRows ?? []).map((l) => l.company_id)])
    );
    if (allCompanyIds.length > 0) {
      const { data: companies } = await supabase.from("companies").select("id, name").in("id", allCompanyIds);
      for (const c of companies ?? []) companyMap[c.id] = c.name;
    }

    const dealMap = new Map((dealRows ?? []).map((d) => [d.id, d]));
    const leadMap = new Map((leadRows ?? []).map((l) => [l.id, l]));

    for (const log of logs) {
      if (log.target_type === "company") {
        result[log.id] = { label: companyMap[log.target_id] ?? "(企業不明)", companyId: log.target_id };
      } else if (log.target_type === "deal") {
        const deal = dealMap.get(log.target_id);
        result[log.id] = {
          label: deal ? `${companyMap[deal.company_id] ?? "(企業不明)"} - ${deal.title}` : "(案件不明)",
          companyId: deal?.company_id ?? null,
        };
      } else if (log.target_type === "lead") {
        const lead = leadMap.get(log.target_id);
        result[log.id] = {
          label: lead ? `${companyMap[lead.company_id] ?? "(企業不明)"} - ${lead.lead_company_name}` : "(リード不明)",
          companyId: lead?.company_id ?? null,
        };
      }
    }
  }

  return result;
}

export default async function AuditLogsPage({ searchParams }: { searchParams: SearchParams }) {
  const { logs, total, page, pageCount } = await getAuditLogs(searchParams);
  const targets = await resolveTargetLabels(logs);

  const actorIds = Array.from(new Set(logs.map((l) => l.user_id).filter((id): id is string => !!id)));
  const actorMap: Record<string, string> = {};
  const supabase = createServerClient();
  if (actorIds.length > 0) {
    const { data } = await supabase.from("users").select("id, name").in("id", actorIds);
    for (const u of data ?? []) actorMap[u.id] = u.name;
  }
  const { data: allUsers } = await supabase.from("users").select("id, name").order("name");

  const items: AuditLogItem[] = logs.map((l) => ({
    id: l.id,
    createdAt: l.created_at,
    actorName: l.user_id ? actorMap[l.user_id] ?? "(退会済みユーザー)" : "クライアント",
    action: l.action,
    targetType: l.target_type,
    targetId: l.target_id,
    targetLabel: targets[l.id]?.label ?? null,
    companyId: targets[l.id]?.companyId ?? null,
    detail: l.detail,
  }));

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-slate-500">
          企業・案件・ユーザー設定等に対する重要な操作の履歴です。誰が・いつ・何を変更したかを確認できます。
        </p>
      </div>

      <Suspense>
        <AuditLogSearchClient users={allUsers ?? []} />
      </Suspense>

      <p className="mb-3 text-xs text-slate-500">
        {total}件中 {logs.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-{(page - 1) * PAGE_SIZE + logs.length}件を表示
      </p>

      <Suspense>
        <AuditLogList items={items} page={page} pageCount={pageCount} />
      </Suspense>
    </div>
  );
}
