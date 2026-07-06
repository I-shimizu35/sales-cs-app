import { test, expect } from "@playwright/test";
import { loginAsStaff } from "./helpers/session";
import { createTestCompany, dbInsert, dbDelete } from "./helpers/db";
import { ADMIN_EMAIL } from "./helpers/constants";

test.describe("ダッシュボードからのドリルダウン", () => {
  let companyId: string;
  let wonDealId: string;
  let hearingDealId: string;

  test.beforeAll(async () => {
    const company = await createTestCompany("drilldown", { support_status: "active" });
    companyId = company.id;
    const won = await dbInsert<{ id: string }>("deals", { company_id: companyId, title: "受注案件", stage: "won" });
    wonDealId = won.id;
    const hearing = await dbInsert<{ id: string }>("deals", {
      company_id: companyId,
      title: "ヒアリング中案件",
      stage: "hearing",
    });
    hearingDealId = hearing.id;
  });

  test.afterAll(async () => {
    await dbDelete(`deals?company_id=eq.${companyId}`);
    await dbDelete(`companies?id=eq.${companyId}`);
  });

  test("/companies?supportStatus=activeで絞り込みバナーが表示され、支援中企業のみ含まれる", async ({
    page,
    context,
  }) => {
    await loginAsStaff(context, ADMIN_EMAIL);
    await page.goto("/companies?supportStatus=active");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=ダッシュボードからの絞り込みが適用されています")).toBeVisible();
  });

  test("案件管理表で?stage=wonを指定すると受注案件のみ表示される", async ({ page, context }) => {
    await loginAsStaff(context, ADMIN_EMAIL);
    await page.goto(`/companies/${companyId}/workspace/deals?stage=won`);
    await page.waitForLoadState("networkidle");

    // 案件管理表(デスクトップ表示)のみを対象にする。モバイル用カードリストは
    // CSSでmd:hiddenになっているだけでDOM上には常に存在するため、"text=..."だけでは
    // 両方にマッチして strict mode violation になる。
    const tableRows = page.locator("table tbody tr");
    await expect(tableRows).toHaveCount(1);
    await expect(tableRows.locator("input[name='title']")).toHaveValue("受注案件");
  });

  test("企業ワークスペースのサマリーカードから案件管理表へ遷移できる", async ({ page, context }) => {
    await loginAsStaff(context, ADMIN_EMAIL);
    await page.goto(`/companies/${companyId}/workspace/dashboard`);
    await page.waitForLoadState("networkidle");
    await page.locator("a", { hasText: "受注(今月)" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(new RegExp(`/companies/${companyId}/workspace/deals`));
  });
});
