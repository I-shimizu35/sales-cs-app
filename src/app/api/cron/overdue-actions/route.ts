import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { sendNotificationEmail } from "@/lib/notifications";
import { recordError } from "@/lib/error-log";
import { createClientNotification } from "@/lib/client-notifications";

/**
 * Vercel Cronから毎日呼ばれ、期日超過(due_date < 今日 かつ status != done)の
 * 次回アクションを担当者ごとに集計し、ダイジェストメールを送る。
 * assignee_id未設定の項目は宛先が定まらないため通知対象外。
 * ユーザーごとの通知設定(受け取る/受け取らない、毎日/毎週月曜のみ)を
 * /profileで変更でき、ここではそれに従って送信をスキップする
 * (「毎週月曜のみ」はcron自体は毎日呼ばれたまま、月曜以外は処理内でスキップする設計)。
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("action_items")
    .select("id, title, due_date, assignee_id, deals(company_id, title, companies(name))")
    .neq("status", "done")
    .lt("due_date", today);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = (data ?? []) as unknown as Array<{
    id: string;
    title: string;
    due_date: string;
    assignee_id: string | null;
    deals: { company_id: string; title: string; companies: { name: string } | null } | null;
  }>;

  // クライアントポータル向けの通知は担当者の有無に関わらず、
  // 企業ごとに1件のダイジェスト通知としてまとめて記録する
  const byCompany = new Map<string, typeof items>();
  for (const item of items) {
    const companyId = item.deals?.company_id;
    if (!companyId) continue;
    const list = byCompany.get(companyId) ?? [];
    list.push(item);
    byCompany.set(companyId, list);
  }
  for (const [companyId, list] of byCompany) {
    await createClientNotification(supabase, {
      companyId,
      type: "action_item_overdue",
      message: `期日超過の次回アクションが${list.length}件あります。`,
    });
  }

  const byAssignee = new Map<string, typeof items>();
  for (const item of items) {
    if (!item.assignee_id) continue;
    const list = byAssignee.get(item.assignee_id) ?? [];
    list.push(item);
    byAssignee.set(item.assignee_id, list);
  }

  if (byAssignee.size === 0) {
    return NextResponse.json({ sent: 0, clientNotified: byCompany.size });
  }

  const { data: assignees, error: usersError } = await supabase
    .from("users")
    .select("id, name, email, notify_overdue_actions, notify_frequency")
    .in("id", Array.from(byAssignee.keys()));
  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  // 「毎週月曜のみ」希望者は月曜以外はスキップする(cronはVercel Cron側の設定を変えず毎日呼ばれる前提)
  const isMonday = new Date().getDay() === 1;

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const user of assignees ?? []) {
    const list = byAssignee.get(user.id) ?? [];
    if (list.length === 0) continue;
    if (!user.notify_overdue_actions) {
      skipped += 1;
      continue;
    }
    if (user.notify_frequency === "weekly" && !isMonday) {
      skipped += 1;
      continue;
    }
    const lines = list.map(
      (item) =>
        `・${item.deals?.companies?.name ?? "不明な企業"} / ${item.deals?.title ?? "不明な案件"} 「${item.title}」(期日: ${item.due_date})`
    );
    try {
      await sendNotificationEmail({
        to: user.email,
        subject: `【要対応】期日超過の次回アクションが${list.length}件あります`,
        body: `${user.name} 様\n\n以下の次回アクションが期日を超過しています。ご確認ください。\n\n${lines.join("\n")}\n\n※本メールは自動送信です。`,
      });
      sent += 1;
    } catch (e) {
      // 1人分の送信失敗で他の担当者への通知が止まらないよう、ログに残して処理を継続する
      await recordError("cron_overdue_actions", e, { userId: user.id, itemCount: list.length });
      failed += 1;
    }
  }

  return NextResponse.json({ sent, failed, skipped, clientNotified: byCompany.size });
}
