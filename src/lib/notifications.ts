import { Resend } from "resend";

const FROM_ADDRESS = process.env.NOTIFICATION_FROM_EMAIL ?? "営業・CS統括システム <onboarding@resend.dev>";

let resendClient: Resend | null = null;
function getResendClient(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * RESEND_API_KEY未設定の間はコンソール出力のみ行うモックモードで動作する
 * (CLAUDE_MOCKと同じ考え方: 外部サービス未接続でも通知ロジック自体は動作確認できる)。
 */
export async function sendNotificationEmail({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[MOCK EMAIL] to=${to}\nsubject=${subject}\n${body}\n`);
    return;
  }

  const { error } = await getResendClient().emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    text: body,
  });

  if (error) {
    console.error(`メール通知の送信に失敗しました(to=${to}, subject=${subject}):`, error);
  }
}
