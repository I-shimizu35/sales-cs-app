import { test, expect } from "@playwright/test";
import { loginAsStaff } from "./helpers/session";
import { createTestCompany, dbInsert, dbDelete } from "./helpers/db";
import { ADMIN_EMAIL } from "./helpers/constants";

test.describe("生成履歴検索画面(/reports)", () => {
  let companyId: string;
  let companyName: string;
  let reportId: string;

  test.beforeAll(async () => {
    const company = await createTestCompany("reports");
    companyId = company.id;
    companyName = company.name;

    const report = await dbInsert<{ id: string }>("generated_reports", {
      target_type: "company",
      target_id: companyId,
      report_type: "company_analysis",
      content: { note: "e2e test report" },
      created_at: "2020-06-01T00:00:00Z",
    });
    reportId = report.id;
  });

  test.afterAll(async () => {
    await dbDelete(`generated_reports?id=eq.${reportId}`);
    await dbDelete(`companies?id=eq.${companyId}`);
  });

  test("対象種別・レポート種別の組み合わせで正しく絞り込まれる", async ({ page, context }) => {
    await loginAsStaff(context, ADMIN_EMAIL);

    // 一致する条件: target_type=company かつ report_type=company_analysis -> 表示される
    await page.goto("/reports?targetType=company&reportType=company_analysis");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(`text=${companyName}`).first()).toBeVisible();

    // 一致しない条件: target_type=deal と組み合わせる -> 除外される
    await page.goto("/reports?targetType=deal&reportType=company_analysis");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(`text=${companyName}`)).toHaveCount(0);

    // 一致しない条件: report_type違い -> 除外される
    await page.goto("/reports?targetType=company&reportType=meeting_minutes");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(`text=${companyName}`)).toHaveCount(0);
  });

  test("期間(dateFrom)で絞り込まれる", async ({ page, context }) => {
    await loginAsStaff(context, ADMIN_EMAIL);

    // テストデータは2020-06-01作成のため、2024年以降でフィルタすると除外される
    await page.goto("/reports?dateFrom=2024-01-01&reportType=company_analysis&targetType=company");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(`text=${companyName}`)).toHaveCount(0);

    // 2020年より前からのフィルタなら含まれる
    await page.goto("/reports?dateFrom=2020-01-01&reportType=company_analysis&targetType=company");
    await page.waitForLoadState("networkidle");
    await expect(page.locator(`text=${companyName}`).first()).toBeVisible();
  });

  test("極端に大きいpage番号を指定してもエラーにならずクランプされる", async ({ page, context }) => {
    await loginAsStaff(context, ADMIN_EMAIL);

    const res = await page.goto("/reports?page=999999");
    expect(res?.status()).toBeLessThan(500);
    await page.waitForLoadState("networkidle");
    // Next.jsのエラーバウンダリが出ていないこと(該当ページで例外が起きていないこと)の簡易確認
    await expect(page.getByRole("heading", { name: "生成履歴" })).toBeVisible();
  });
});
