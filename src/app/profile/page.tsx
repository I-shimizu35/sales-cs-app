import { createServerClient } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/auth";
import { AppUser, UserRole } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { updateOwnProfile } from "./actions";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "管理者",
  manager: "マネージャー",
  cs: "CS担当",
  sales: "営業担当",
  support: "支援担当",
};

async function getOwnUser(userId: string): Promise<AppUser | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();
  if (error) throw new Error(`プロフィールの取得に失敗しました: ${error.message}`);
  return data as AppUser | null;
}

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;
  const user = await getOwnUser(currentUser.id);
  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-lg px-8 py-10">
      <PageHeader title="プロフィール" description="自分のアカウント情報を確認・編集できます。" />

      <form action={updateOwnProfile} className="card space-y-5 p-6">
        <div>
          <label className="field-label">氏名</label>
          <input name="name" defaultValue={user.name} required className="field" />
        </div>
        <div>
          <label className="field-label">メールアドレス</label>
          <input value={user.email} disabled className="field bg-slate-50 text-slate-400" />
          <p className="mt-1 text-xs text-slate-400">Googleアカウントに紐づくため、ここからは変更できません。</p>
        </div>
        <div>
          <label className="field-label">ロール</label>
          <input value={ROLE_LABEL[user.role]} disabled className="field bg-slate-50 text-slate-400" />
          <p className="mt-1 text-xs text-slate-400">ロールの変更は管理者にご依頼ください。</p>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">通知設定</h3>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              name="notify_overdue_actions"
              defaultChecked={user.notify_overdue_actions}
              className="h-4 w-4 rounded border-slate-300"
            />
            期日超過の次回アクションをメールで通知する
          </label>
          <div className="mt-3">
            <label className="field-label">通知頻度</label>
            <select name="notify_frequency" defaultValue={user.notify_frequency} className="field w-auto">
              <option value="daily">毎日</option>
              <option value="weekly">毎週月曜のみ</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-brand">
            保存する
          </button>
        </div>
      </form>
    </div>
  );
}
