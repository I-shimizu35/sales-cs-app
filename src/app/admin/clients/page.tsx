import Link from "next/link";
import { createServerClient } from "@/lib/supabase";
import { ClientPortalPanel } from "@/components/client-portal-panel";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  const supabase = createServerClient();
  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, client_portal_enabled")
    .order("name");
  if (error) throw new Error(`企業一覧の取得に失敗しました: ${error.message}`);

  return (
    <div>
      <p className="mb-6 text-sm text-slate-500">
        クライアント企業ごとにポータルアクセスを発行・管理します。企業ごとに1つの共有パスワードを発行し、専用URLとあわせてクライアントへ共有してください。
      </p>

      {(companies ?? []).length === 0 ? (
        <p className="text-sm text-slate-400">企業が登録されていません。</p>
      ) : (
        <div className="space-y-6">
          {(companies ?? []).map((c) => (
            <div key={c.id}>
              <div className="mb-2 flex items-center justify-between">
                <Link href={`/companies/${c.id}`} className="text-sm font-semibold text-slate-900 hover:text-brand-600">
                  {c.name}
                </Link>
                <Link href={`/companies/${c.id}/workspace/dashboard`} className="btn-secondary btn-sm">
                  この企業の管理画面に入る
                </Link>
              </div>
              <ClientPortalPanel companyId={c.id} portalEnabled={c.client_portal_enabled} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
