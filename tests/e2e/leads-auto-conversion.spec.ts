import { test, expect } from "@playwright/test";
import { loginAsStaff } from "./helpers/session";
import { createTestCompany, dbInsert, dbGet, dbDelete } from "./helpers/db";
import { waitForCondition } from "./helpers/wait";
import { ADMIN_EMAIL } from "./helpers/constants";

test.describe("失注案件からのリード自動登録", () => {
  let companyId: string;
  let dealId: string;

  test.beforeAll(async () => {
    const company = await createTestCompany("leadauto");
    companyId = company.id;
    const deal = await dbInsert<{ id: string }>("deals", {
      company_id: companyId,
      title: "E2E lead auto-conversion deal",
      stage: "first_contact",
    });
    dealId = deal.id;
  });

  test.afterAll(async () => {
    await dbDelete(`leads?company_id=eq.${companyId}`);
    await dbDelete(`deals?id=eq.${dealId}`);
    await dbDelete(`companies?id=eq.${companyId}`);
  });

  test("first_contact段階の案件を失注にすると自動でリード化される", async ({ page, context }) => {
    await loginAsStaff(context, ADMIN_EMAIL);
    await page.goto(`/companies/${companyId}/workspace/deals`);
    await page.waitForLoadState("networkidle");

    const firstRow = page.locator("table tbody tr").first();
    await firstRow.locator('select[name="stage"]').selectOption("lost");
    await firstRow.locator('button:has-text("更新")').click();

    await waitForCondition(async () => {
      const deal = await dbGet<{ stage: string }[]>(`deals?id=eq.${dealId}&select=stage`);
      return deal[0]?.stage === "lost";
    });

    let leads: { id: string; converted_from_deal_id: string }[] = [];
    await waitForCondition(async () => {
      leads = await dbGet<{ id: string; converted_from_deal_id: string }[]>(
        `leads?converted_from_deal_id=eq.${dealId}&select=id,converted_from_deal_id`
      );
      return leads.length > 0;
    });
    expect(leads.length).toBe(1);
  });

  test("既にlostの案件を再保存してもリードが重複登録されない", async ({ page, context }) => {
    await loginAsStaff(context, ADMIN_EMAIL);
    await page.goto(`/companies/${companyId}/workspace/deals`);
    await page.waitForLoadState("networkidle");

    // 既にlostの状態でタイトルだけ変更して再保存(stageは変更しない)
    const newTitle = "E2E lead auto-conversion deal (再保存)";
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.locator('input[name="title"]').fill(newTitle);
    await firstRow.locator('button:has-text("更新")').click();

    await waitForCondition(async () => {
      const deal = await dbGet<{ title: string }[]>(`deals?id=eq.${dealId}&select=title`);
      return deal[0]?.title === newTitle;
    });

    const leads = await dbGet<{ id: string }[]>(`leads?converted_from_deal_id=eq.${dealId}&select=id`);
    expect(leads.length).toBe(1);
  });
});
