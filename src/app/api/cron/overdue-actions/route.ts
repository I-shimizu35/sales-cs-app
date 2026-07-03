import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { sendNotificationEmail } from "@/lib/notifications";

/**
 * Vercel Cronから毎日呼ばれ、期日超過(due_date < 今日 かつ status != done)の
 * 次回アクションを担当者ごとに集計し、ダイジェストメールを送る。
 * assignee_id未設定の項目は宛先が定まらないため通知対象外。
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
    .select("id, title, due_date, assignee_id, deals(title, companies(name))")
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
    deals: { title: string; companies: { name: string } | null } | null;
  }>;

  const byAssignee = new Map<string, typeof items>();
  for (const item of items) {
    if (!item.assignee_id) continue;
    const list = byAssignee.get(item.assignee_id) ?? [];
    list.push(item);
    byAssignee.set(item.assignee_id, list);
  }

  if (byAssignee.size === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const { data: assignees, error: usersError } = await supabase
    .from("users")
    .select("id, name, email")
    .in("id", Array.from(byAssignee.keys()));
  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  let sent = 0;
  for (const user of assignees ?? []) {
    const list = byAssignee.get(user.id) ?? [];
    if (list.length === 0) continue;
    const lines = list.map(
      (item) =>
        `・${item.deals?.companies?.name ?? "不明な企業"} / ${item.deals?.title ?? "不明な案件"} 「${item.title}」(期日: ${item.due_date})`
    );
    await sendNotificationEmail({
      to: user.email,
      subject: `【要対応】期日超過の次回アクションが${list.length}件あります`,
      body: `${user.name} 様\n\n以下の次回アクションが期日を超過しています。ご確認ください。\n\n${lines.join("\n")}\n\n※本メールは自動送信です。`,
    });
    sent += 1;
  }

  return NextResponse.json({ sent });
}
