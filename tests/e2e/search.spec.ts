import { test, expect } from "@playwright/test";
import { loginAsStaff } from "./helpers/session";
import { createTestCompany, dbInsert, dbDelete } from "./helpers/db";
import { ADMIN_EMAIL } from "./helpers/constants";

test.describe("横断検索(/search)", () => {
  let companyId: string;
  let companyName: string;
  let dealId: string;
  let leadId: string;
  const uniqueTag = `E2E横断検索確認_${Date.now()}`;

  test.beforeAll(async () => {
    const company = await createTestCompany("search", { name: `${uniqueTag}` });
    companyId = company.id;
    companyName = company.name;
    const deal = await dbInsert<{ id: string }>("deals", {
      company_id: companyId,
      title: `${uniqueTag}_案件`,
      stage: "hearing",
    });
    dealId = deal.id;
    const lead = await dbInsert<{ id: string }>("leads", {
      company_id: companyId,
      lead_company_name: `${uniqueTag}_リード`,
    });
    leadId = lead.id;
  });

  test.afterAll(async () => {
    await dbDelete(`leads?id=eq.${leadId}`);
    await dbDelete(`deals?id=eq.${dealId}`);
    await dbDelete(`companies?id=eq.${companyId}`);
  });

  test("企業・案件・リードを横断検索でき、それぞれのリンク先に遷移できる", async ({ page, context }) => {
    await loginAsStaff(context, ADMIN_EMAIL);
    await page.goto(`/search?q=${encodeURIComponent(uniqueTag)}`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator(`text=${companyName}`).first()).toBeVisible();
    await expect(page.locator(`text=${uniqueTag}_案件`).first()).toBeVisible();
    await expect(page.locator(`text=${uniqueTag}_リード`).first()).toBeVisible();

    await page.locator(`text=${uniqueTag}_案件`).first().click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(new RegExp(`/companies/${companyId}/workspace/deals`));
  });

  test("該当しないキーワードでは何もヒットしない旨が表示される", async ({ page, context }) => {
    await loginAsStaff(context, ADMIN_EMAIL);
    await page.goto(`/search?q=絶対に存在しないはずのキーワードXYZ999`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("text=に一致する結果がありません")).toBeVisible();
  });
});
