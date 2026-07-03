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
        <div className="flex justify-end">
          <button type="submit" className="btn-brand">
            保存する
          </button>
        </div>
      </form>
    </div>
  );
}
