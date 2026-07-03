import { test, expect } from "@playwright/test";
import { loginAsStaff } from "./helpers/session";
import { createTestCompany, dbInsert, dbGet, dbDelete, ensureTestStaffUser } from "./helpers/db";

test.describe("ロール別権限制御(owner以外は編集不可)", () => {
  let companyId: string;
  let dealId: string;

  test.beforeAll(async () => {
    const owner = await ensureTestStaffUser("e2e-perm-owner@example.com", "sales");
    const other = await ensureTestStaffUser("e2e-perm-other@example.com", "sales");

    const company = await createTestCompany("perm", { owner_user_id: owner.id });
    companyId = company.id;
    const deal = await dbInsert<{ id: string }>("deals", {
      company_id: companyId,
      title: "E2E permission deal",
      stage: "first_contact",
      owner_user_id: owner.id,
    });
    dealId = deal.id;
    // otherユーザーの存在だけ確認しておく(未使用変数警告回避目的ではなく、テスト前提の可視化)
    expect(other.id).toBeTruthy();
  });

  test.afterAll(async () => {
    await dbDelete(`action_items?deal_id=eq.${dealId}`);
    await dbDelete(`deals?id=eq.${dealId}`);
    await dbDelete(`companies?id=eq.${companyId}`);
  });

  test("自分がownerでない案件のフェーズを変更しても保存されない", async ({ page, context }) => {
    await loginAsStaff(context, "e2e-perm-other@example.com");
    await page.goto(`/companies/${companyId}/workspace/deals`);
    await page.waitForLoadState("networkidle");

    const firstRow = page.locator("table tbody tr").first();
    await firstRow.locator('select[name="stage"]').selectOption("hearing");
    await firstRow.locator('button:has-text("更新")').click();
    await page.waitForTimeout(1200);

    const after = await dbGet<{ stage: string }[]>(`deals?id=eq.${dealId}&select=stage`);
    expect(after[0].stage).toBe("first_contact");
  });

  test("ownerである本人は案件のフェーズを変更でき、保存される", async ({ page, context }) => {
    await loginAsStaff(context, "e2e-perm-owner@example.com");
    await page.goto(`/companies/${companyId}/workspace/deals`);
    await page.waitForLoadState("networkidle");

    const firstRow = page.locator("table tbody tr").first();
    await firstRow.locator('select[name="stage"]').selectOption("hearing");
    await firstRow.locator('button:has-text("更新")').click();
    await page.waitForTimeout(1200);

    const after = await dbGet<{ stage: string }[]>(`deals?id=eq.${dealId}&select=stage`);
    expect(after[0].stage).toBe("hearing");
  });
});
