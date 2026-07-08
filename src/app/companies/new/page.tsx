import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createServerClient } from "@/lib/supabase";
import { AppUser } from "@/lib/types";
import { getCurrentUser, isManagerOrAdmin } from "@/lib/auth";
import { createCompany } from "../actions";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  admin: "管理者",
  manager: "マネージャー",
  cs: "CS担当",
  sales: "営業担当",
  support: "支援担当",
};

async function getUsers(): Promise<AppUser[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("users").select("*").order("name");
  if (error) throw new Error(`ユーザー一覧の取得に失敗しました: ${error.message}`);
  return data as AppUser[];
}

export default async function NewCompanyPage() {
  const [users, currentUser] = await Promise.all([getUsers(), getCurrentUser()]);
  const canChooseOwner = !!currentUser && isManagerOrAdmin(currentUser.role);

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-10">
      <Link
        href="/companies"
        className="mb-6 flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        企業一覧へ戻る
      </Link>

      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-slate-900">新規企業登録</h1>

      <form action={createCompany} className="card space-y-5 p-6">
        <div>
          <label className="field-label">
            会社名 <span className="text-red-500">*</span>
          </label>
          <input name="name" required className="field" />
        </div>
        <div>
          <label className="field-label">主担当(社内)</label>
          {!canChooseOwner ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
              あなた自身が担当者として登録されます。
            </p>
          ) : users.length === 0 ? (
            <p className="text-xs text-slate-400">
              登録済みのユーザーがいません。
              <Link href="/admin/users" className="text-brand-600 underline">
                ユーザー管理
              </Link>
              から先に担当者を登録してください(未設定のまま企業登録も可能です)。
            </p>
          ) : (
            <select name="owner_user_id" defaultValue="" className="field">
              <option value="">未設定</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}({ROLE_LABEL[u.role]})
                </option>
              ))}
            </select>
          )}
        </div>
        <div>
          <label className="field-label">URL</label>
          <input name="url" className="field" />
        </div>
        <div>
          <label className="field-label">業種</label>
          <input name="industry" className="field" />
        </div>
        <div>
          <label className="field-label">事業内容</label>
          <textarea name="business_summary" rows={3} className="field" />
        </div>
        <div>
          <label className="field-label">現状課題</label>
          <textarea name="current_issues" rows={3} className="field" />
        </div>
        <div>
          <label className="field-label">目標</label>
          <textarea name="goals" rows={3} className="field" />
        </div>
        <div className="flex justify-end pt-1">
          <button type="submit" className="btn-brand px-5">
            登録する
          </button>
        </div>
      </form>
    </div>
  );
}
