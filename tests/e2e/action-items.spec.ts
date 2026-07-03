import { test, expect } from "@playwright/test";
import { loginAsStaff } from "./helpers/session";
import { createTestCompany, dbInsert, dbGet, dbDelete } from "./helpers/db";
import { waitForCondition } from "./helpers/wait";
import { ADMIN_EMAIL } from "./helpers/constants";

test.describe("次回アクション(action_items)CRUD", () => {
  let companyId: string;
  let dealId: string;
  const actionTitle = `E2Eテストアクション_${Date.now()}`;

  test.beforeAll(async () => {
    const company = await createTestCompany("actionitem");
    companyId = company.id;
    const deal = await dbInsert<{ id: string }>("deals", {
      company_id: companyId,
      title: "E2E action item deal",
      stage: "hearing",
    });
    dealId = deal.id;
  });

  test.afterAll(async () => {
    await dbDelete(`action_items?deal_id=eq.${dealId}`);
    await dbDelete(`deals?id=eq.${dealId}`);
    await dbDelete(`companies?id=eq.${companyId}`);
  });

  test("案件カードから次回アクションを追加・ステータス変更・削除できる", async ({ page, context }) => {
    await loginAsStaff(context, ADMIN_EMAIL);
    await page.goto(`/companies/${companyId}/workspace/deals`);
    await page.waitForLoadState("networkidle");

    // 1. 追加
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const panel = page.locator("section", { hasText: "次回アクション" });
    await panel.locator('input[name="title"]').fill(actionTitle);
    await panel.locator('input[name="due_date"]').fill(dueDate);
    await panel.locator('button:has-text("追加")').click();

    let createdRows: { id: string; status: string }[] = [];
    await waitForCondition(async () => {
      createdRows = await dbGet<{ id: string; status: string }[]>(
        `action_items?deal_id=eq.${dealId}&title=eq.${encodeURIComponent(actionTitle)}&select=id,status`
      );
      return createdRows.length > 0;
    });
    expect(createdRows.length).toBe(1);
    expect(createdRows[0].status).toBe("todo");
    const actionItemId = createdRows[0].id;

    // 2. ステータス変更
    await page.reload();
    await page.waitForLoadState("networkidle");
    const row = page.locator("div", { hasText: actionTitle }).last();
    await row.locator('select[name="status"]').selectOption("done");

    await waitForCondition(async () => {
      const after = await dbGet<{ status: string }[]>(`action_items?id=eq.${actionItemId}&select=status`);
      return after[0]?.status === "done";
    });

    // 3. 削除(ダッシュボード表示・遷移の確認は別テストで行う)
    await page.reload();
    await page.waitForLoadState("networkidle");
    const rowAfterReload = page.locator("div", { hasText: actionTitle }).last();
    await rowAfterReload.locator('button[title="削除"]').click();

    await waitForCondition(async () => {
      const after = await dbGet<unknown[]>(`action_items?id=eq.${actionItemId}&select=id`);
      return Array.isArray(after) && after.length === 0;
    });
  });

  test("未完了の次回アクションがダッシュボードに表示され、クリックで企業詳細に遷移する", async ({
    page,
    context,
  }) => {
    // ダッシュボードの「要対応アクション」はdue_date昇順で上位8件のみ表示されるため、
    // 他の(実データの)期日超過アクションに埋もれないよう極端に古い日付にして必ず先頭に来るようにする
    const dueDate = "2000-01-01";
    const dashboardActionTitle = `E2Eダッシュボード表示テスト_${Date.now()}`;
    const created = await dbInsert<{ id: string }>("action_items", {
      deal_id: dealId,
      title: dashboardActionTitle,
      due_date: dueDate,
      status: "todo",
    });

    await loginAsStaff(context, ADMIN_EMAIL);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const link = page.locator(`text=${dashboardActionTitle}`).first();
    await expect(link).toBeVisible();
    await link.click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(new RegExp(companyId));

    await dbDelete(`action_items?id=eq.${created.id}`);
  });
});
