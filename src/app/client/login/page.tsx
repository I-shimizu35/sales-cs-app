import { Building2 } from "lucide-react";
import { ClientLoginForm } from "./client-login-form";
import { ForgotPasswordLink } from "./forgot-password-link";

export default function ClientLoginPage({
  searchParams,
}: {
  searchParams: { c?: string };
}) {
  const slug = searchParams.c ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">クライアントポータル</h1>
          <p className="mt-1 text-sm text-slate-500">
            発行されたパスワードを入力してください。
          </p>
        </div>

        {!slug ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            ログインURLが正しくありません。発行元にご確認ください。
          </p>
        ) : (
          <ClientLoginForm slug={slug} />
        )}
        {slug && <ForgotPasswordLink slug={slug} />}
      </div>
    </div>
  );
}
