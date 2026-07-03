import { WeeklyReport, MonthlyReport } from "./analytics-data";

export function formatDateJp(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${y}/${m}/${d}`;
}

export function buildWeeklyReportText(report: WeeklyReport, companyName: string): string {
  return [
    `【${companyName}様 週次ご報告】`,
    `対象期間: ${formatDateJp(report.weekStart)}〜${formatDateJp(report.weekEnd)}`,
    "",
    `累計ヨミ件数: ${report.yomiCount}件`,
    `累計ヨミ金額: ¥${report.expectedRevenueTotal.toLocaleString()}`,
    "",
    `今週の新規商談数: ${report.newMeetingsThisWeek}件`,
    `今週の受注: ${report.wonCountThisWeek}件(¥${report.wonAmountThisWeek.toLocaleString()})`,
  ].join("\n");
}

export function buildMonthlyReportText(report: MonthlyReport, companyName: string): string {
  const lines = [
    `【${companyName}様 月次定例MTG報告】`,
    `対象月: ${report.month}`,
    "",
    `新規商談数: ${report.newMeetings}件`,
    `受注: ${report.wonCount}件(¥${report.wonAmount.toLocaleString()})`,
    `失注: ${report.lostCount}件`,
  ];
  if (report.topLostReasons.length > 0) {
    lines.push("", "主な失注理由:");
    for (const r of report.topLostReasons) {
      lines.push(`・${r.reason}(${r.count}件)`);
    }
  }
  return lines.join("\n");
}
