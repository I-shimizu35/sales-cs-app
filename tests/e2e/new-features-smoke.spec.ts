import { test, expect } from "@playwright/test";
import { loginAsStaff } from "./helpers/session";
import { createTestCompany, dbInsert, dbGet, dbDelete } from "./helpers/db";
import { ADMIN_EMAIL } from "./helpers/constants";

test.describe("/admin/performance", () => {
  test("担当者別受注実績ページが表示される", async ({ page, context }) => {
    await loginAsStaff(context, ADMIN_EMAIL);
    await page.goto("/admin/performance");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=担当者別受注実績")).toBeVisible();
  });
});

test.describe("文字起こし詳細モーダル", () => {
  let companyId: string;
  let dealId: string;
  let meetingId: string;
  let transcriptId: string;
  const fullText = "これはE2E回帰テスト用の全文テキストです。".repeat(10);
  const dealTitle = `E2E文字起こし詳細確認_${Date.now()}`;

  test.beforeAll(async () => {
    const company = await createTestCompany("transcript-detail");
    companyId = company.id;
    const deal = await dbInsert<{ id: string }>("deals", { company_id: companyId, title: dealTitle, stage: "hearing" });
    dealId = deal.id;
    const meeting = await dbInsert<{ id: string }>("meetings", { deal_id: dealId, meeting_type: "hearing" });
    meetingId = meeting.id;
    const transcript = await dbInsert<{ id: string }>("transcripts", { meeting_id: meetingId, raw_text: fullText });
    transcriptId = transcript.id;
  });

  test.afterAll(async () => {
    await dbDelete(`transcripts?id=eq.${transcriptId}`);
    await dbDelete(`meetings?id=eq.${meetingId}`);
    await dbDelete(`deals?id=eq.${dealId}`);
    await dbDelete(`companies?id=eq.${companyId}`);
  });

  test("「全文を見る」ボタンでモーダルに全文が表示される", async ({ page, context }) => {
    await loginAsStaff(context, ADMIN_EMAIL);
    await page.goto("/transcripts/new");
    await page.waitForLoadState("networkidle");

    const historyCard = page
      .locator(".card")
      .filter({ hasText: dealTitle })
      .filter({ has: page.locator('button:has-text("全文を見る")') })
      .first();
    await historyCard.locator('button:has-text("全文を見る")').click();

    const modalText = await page.locator("p.whitespace-pre-wrap").first().textContent();
    expect(modalText).toContain("E2E回帰テスト用の全文テキスト");
  });
});

test.describe("追加されたAIレポート種別(商談準備タブ)", () => {
  let companyId: string;

  test.beforeAll(async () => {
    const company = await createTestCompany("new-report-types", {
      industry: "テスト業種",
      business_summary: "テスト事業",
      current_issues: "テスト課題",
    });
    companyId = company.id;
  });

  test.afterAll(async () => {
    await dbDelete(`generated_reports?target_id=eq.${companyId}`);
    await dbDelete(`companies?id=eq.${companyId}`);
  });

  test("業界分析・想定課題・Q&Aリストの生成ボタンが表示され、想定課題が生成できる", async ({
    page,
    context,
  }) => {
    await loginAsStaff(context, ADMIN_EMAIL);
    await page.goto(`/companies/${companyId}`);
    await page.waitForLoadState("networkidle");
    await page.locator('button:has-text("商談準備 (AI)")').click();
    await page.waitForTimeout(300);

    for (const label of ["業界分析", "商流分析", "収益構造分析", "想定課題", "Q&Aリスト"]) {
      await expect(page.locator(`button:has-text("${label}を生成")`)).toBeVisible();
    }

    await page.locator('button:has-text("想定課題を生成")').click();
    await expect(page.locator('h4:has-text("想定課題")')).toBeVisible({ timeout: 10000 });

    const saved = await dbGet<{ id: string }[]>(
      `generated_reports?target_type=eq.company&target_id=eq.${companyId}&report_type=eq.assumed_issues&select=id`
    );
    expect(saved.length).toBeGreaterThan(0);
  });
});
