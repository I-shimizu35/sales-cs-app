import { Building2 } from "lucide-react";
import Link from "next/link";

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: "1. 基本方針",
    body: [
      "アイドマ・ホールディングス株式会社(以下「当社」といいます)は、営業・CS統括システム(以下「本サービス」といいます)において取り扱う個人情報・企業情報の重要性を認識し、適切な取得・利用・管理に努めます。",
    ],
  },
  {
    title: "2. 取得する情報",
    body: [
      "・本サービスの利用者(当社スタッフおよびクライアント企業の担当者)の氏名、メールアドレス、役職等のアカウント情報",
      "・クライアント企業の商談・案件に関する情報(企業名、担当者名、商談内容、提案内容、議事録、金額等の営業情報)",
      "・本サービスの利用状況に関するログ(アクセス日時、操作内容、IPアドレス等)",
    ],
  },
  {
    title: "3. 利用目的",
    body: [
      "・本サービスの提供、維持、改善のため",
      "・クライアント企業への営業・カスタマーサクセス支援業務の遂行のため",
      "・AIによる商談準備資料・議事録・フィードバック等の生成のため",
      "・不正利用の防止、セキュリティの確保のため",
      "・利用者への連絡、通知の送付のため",
    ],
  },
  {
    title: "4. 第三者への提供",
    body: [
      "当社は、法令に基づく場合を除き、本人の同意なく個人情報を第三者に提供することはありません。",
    ],
  },
  {
    title: "5. 外部サービスへの委託(サブプロセッサ)",
    body: [
      "当社は、本サービスの提供にあたり、以下の外部サービスを利用しています。これらのサービスへは、本サービスの提供に必要な範囲でデータが送信・保存されます。",
      "・Supabase(データベース・認証基盤)",
      "・Anthropic(AIによる文章生成機能。商談内容等の一部が生成処理のため送信されます)",
      "・Resend(メール通知の送信)",
      "・Vercel(アプリケーションのホスティング)",
    ],
  },
  {
    title: "6. Cookie等の利用",
    body: [
      "本サービスは、ログイン状態の維持等を目的として、Cookieを利用します。Cookieには氏名・メールアドレス等の直接的な個人情報は含まれず、セッションの識別のみに用いられます。",
    ],
  },
  {
    title: "7. 安全管理措置",
    body: [
      "当社は、取り扱う情報への不正アクセス、紛失、破壊、改ざん、漏えい等を防止するため、アクセス権限の制御、通信の暗号化、パスワードのハッシュ化等の合理的な安全管理措置を講じます。",
    ],
  },
  {
    title: "8. 保有期間",
    body: [
      "個人情報・企業情報は、利用目的の達成に必要な期間、または法令等で定める期間保有し、支援契約の終了等により不要となった場合には、合理的な期間内に削除または匿名化します。",
    ],
  },
  {
    title: "9. 開示・訂正・削除等の請求",
    body: [
      "利用者は、当社が保有する自己に関する個人情報について、開示・訂正・削除等を請求することができます。ご希望の場合は、下記のお問い合わせ窓口までご連絡ください。",
    ],
  },
  {
    title: "10. お問い合わせ窓口",
    body: [
      "本ポリシーおよび個人情報の取り扱いに関するお問い合わせは、担当スタッフまたはアイドマ・ホールディングス株式会社の営業窓口までご連絡ください。",
    ],
  },
  {
    title: "11. 改定",
    body: [
      "当社は、必要に応じて本ポリシーの内容を改定することがあります。改定後のポリシーは、本ページに掲載された時点から効力を生じるものとします。",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900">プライバシーポリシー</h1>
          <p className="mt-1 text-xs text-slate-400">最終改定日: 2026年7月6日</p>
        </div>

        <div className="card space-y-8 p-8">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="mb-2 text-sm font-semibold text-slate-900">{section.title}</h2>
              <div className="space-y-2">
                {section.body.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-slate-600">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          <Link href="/terms" className="underline hover:text-slate-600">
            利用規約
          </Link>
        </p>
      </div>
    </div>
  );
}
