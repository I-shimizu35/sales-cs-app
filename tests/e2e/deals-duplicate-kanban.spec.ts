import { test, expect } from "@playwright/test";
import { loginAsStaff } from "./helpers/session";
import { createTestCompany, dbInsert, dbGet, dbDelete } from "./helpers/db";
import { waitForCondition } from "./helpers/wait";
import { ADMIN_EMAIL } from "./helpers/constants";

test.describe("案件の複製", () => {
  let companyId: string;
  let dealId: string;

  test.beforeAll(async () => {
    const company = await createTestCompany("duplicate");
    companyId = company.id;
    const deal = await dbInsert<{ id: string }>("deals", {
      company_id: companyId,
      title: "元案件",
      stage: "won",
      amount: 1000000,
      deal_category: "新規導入",
      contact_name: "山田太郎",
      lead_source: "紹介",
    });
    dealId = deal.id;
  });

  test.afterAll(async () => {
    await dbDelete(`deals?company_id=eq.${companyId}`);
    await dbDelete(`companies?id=eq.${companyId}`);
  });

  test("複製ボタンで構造項目のみ引き継いだ新規案件が作成される", async ({ page, context }) => {
    await loginAsStaff(context, ADMIN_EMAIL);
    await page.goto(`/companies/${companyId}/workspace/deals`);
    await page.waitForLoadState("networkidle");

    const firstRow = page.locator("table tbody tr").first();
    await firstRow.locator('button[title*="複製"]').click();

    let duplicated: { title: string; stage: string; amount: number | null; deal_category: string | null } | undefined;
    await waitForCondition(async () => {
      const rows = await dbGet<typeof duplicated[]>(
        `deals?company_id=eq.${companyId}&title=like.*コピー*&select=title,stage,amount,deal_category`
      );
      if (rows.length > 0) {
        duplicated = rows[0];
        return true;
      }
      return false;
    });

    expect(duplicated?.title).toBe("元案件のコピー");
    expect(duplicated?.stage).toBe("first_contact");
    expect(duplicated?.amount).toBeNull();
    expect(duplicated?.deal_category).toBe("新規導入");
  });
});

test.describe("案件のカンバン表示", () => {
  let companyId: string;
  let dealId: string;

  test.beforeAll(async () => {
    const company = await createTestCompany("kanban");
    companyId = company.id;
    const deal = await dbInsert<{ id: string }>("deals", {
      company_id: companyId,
      title: "カンバンE2E案件",
      stage: "first_contact",
    });
    dealId = deal.id;
  });

  test.afterAll(async () => {
    await dbDelete(`deals?company_id=eq.${companyId}`);
    await dbDelete(`companies?id=eq.${companyId}`);
  });

  test("カンバン表示に切り替えてドラッグ&ドロップするとステージが更新される", async ({ page, context }) => {
    await loginAsStaff(context, ADMIN_EMAIL);
    await page.goto(`/companies/${companyId}/workspace/deals`);
    await page.waitForLoadState("networkidle");

    await page.locator('button[title="カンバン表示(ドラッグ&ドロップでステータス変更)"]').click();
    await page.waitForTimeout(500);

    // モバイル用カードリストも同じタイトルをDOM上に(CSSで非表示のまま)持つため、
    // カンバン固有のdraggableカードだけを対象にする
    const card = page.locator('[draggable="true"]', { hasText: "カンバンE2E案件" }).first();
    await expect(card).toBeVisible();

    const hearingColumn = page.locator("h3", { hasText: "ヒアリング" }).locator("xpath=../..");
    await card.dragTo(hearingColumn);

    await waitForCondition(async () => {
      const rows = await dbGet<{ stage: string }[]>(`deals?id=eq.${dealId}&select=stage`);
      return rows[0]?.stage === "hearing";
    });
  });
});
