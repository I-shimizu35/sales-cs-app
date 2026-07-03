import { createServerClient } from "@/lib/supabase";
import { AppUser } from "@/lib/types";
import { getCurrentUser } from "@/lib/auth";
import { createUser, updateUserRole, updateUserStatus } from "./actions";
import { RoleSelect, StatusSelect } from "./role-status-select";

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
  const { data, error } = await supabase.from("users").select("*").order("created_at");
  if (error) throw new Error(`ユーザー一覧の取得に失敗しました: ${error.message}`);
  return data as AppUser[];
}

export default async function AdminUsersPage() {
  const [users, currentUser] = await Promise.all([getUsers(), getCurrentUser()]);

  return (
    <div>
      <div className="mb-6">
        <p className="text-sm text-slate-500">
          ここで登録したユーザーが、企業・案件の「担当者」選択肢に表示されます。
          Googleログイン後、メールアドレスが一致すれば自動的に紐付けられます。
        </p>
      </div>

      <div className="card mb-8 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/70 text-slate-500">
            <tr>
              <th className="whitespace-nowrap px-6 py-3 font-medium">氏名</th>
              <th className="whitespace-nowrap px-6 py-3 font-medium">メールアドレス</th>
              <th className="whitespace-nowrap px-6 py-3 font-medium">ロール</th>
              <th className="whitespace-nowrap px-6 py-3 font-medium">ステータス</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 && (
              <tr>
                <td className="px-6 py-6 text-center text-slate-500" colSpan={4}>
                  ユーザーが登録されていません。下のフォームから追加してください。
                </td>
              </tr>
            )}
            {users.map((u) => {
              const updateRoleWithId = updateUserRole.bind(null, u.id);
              const updateStatusWithId = updateUserStatus.bind(null, u.id);
              const isSelf = u.id === currentUser?.id;
              return (
                <tr key={u.id} className="transition-colors hover:bg-slate-50/60">
                  <td className="px-6 py-3 font-medium text-slate-900">
                    {u.name}
                    {isSelf && <span className="ml-2 text-xs text-slate-400">(自分)</span>}
                  </td>
                  <td className="px-6 py-3 text-slate-600">{u.email}</td>
                  <td className="px-6 py-3">
                    {isSelf ? (
                      <span className="field-sm inline-block w-auto py-1 text-slate-400">
                        {ROLE_LABEL[u.role]}
                      </span>
                    ) : (
                      <RoleSelect action={updateRoleWithId} defaultValue={u.role} />
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {isSelf ? (
                      <span className="field-sm inline-block w-auto py-1 text-slate-400">
                        {u.status === "active" ? "有効" : "無効"}
                      </span>
                    ) : (
                      <StatusSelect action={updateStatusWithId} defaultValue={u.status} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="card p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">新規ユーザー登録</h2>
        <form action={createUser} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="text-sm text-slate-700">
              氏名 <span className="text-red-500">*</span>
              <input name="name" required className="field mt-1" />
            </label>
            <label className="text-sm text-slate-700">
              メールアドレス <span className="text-red-500">*</span>
              <input name="email" type="email" required className="field mt-1" />
            </label>
            <label className="text-sm text-slate-700">
              ロール
              <select name="role" defaultValue="sales" className="field mt-1">
                {Object.entries(ROLE_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="btn-brand w-fit">
            登録する
          </button>
        </form>
      </section>
    </div>
  );
}
