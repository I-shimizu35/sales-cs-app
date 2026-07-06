import { test, expect } from "@playwright/test";
import { loginAsStaff } from "./helpers/session";
import { dbGet, dbPatch } from "./helpers/db";
import { waitForCondition } from "./helpers/wait";
import { ADMIN_EMAIL } from "./helpers/constants";

test.describe("個人別通知設定(/profile)", () => {
  let adminUserId: string;
  let originalPrefs: { notify_overdue_actions: boolean; notify_frequency: string };

  test.beforeAll(async () => {
    const rows = await dbGet<{ id: string; notify_overdue_actions: boolean; notify_frequency: string }[]>(
      `users?email=eq.${encodeURIComponent(ADMIN_EMAIL)}&select=id,notify_overdue_actions,notify_frequency`
    );
    adminUserId = rows[0].id;
    originalPrefs = { notify_overdue_actions: rows[0].notify_overdue_actions, notify_frequency: rows[0].notify_frequency };
  });

  test.afterAll(async () => {
    await dbPatch(`users?id=eq.${adminUserId}`, originalPrefs);
  });

  test("通知設定(受け取らない・毎週月曜のみ)を変更して保存できる", async ({ page, context }) => {
    await loginAsStaff(context, ADMIN_EMAIL);
    await page.goto("/profile");
    await page.waitForLoadState("networkidle");

    await page.locator('input[name="notify_overdue_actions"]').uncheck();
    await page.locator('select[name="notify_frequency"]').selectOption("weekly");
    await page.locator('button:has-text("保存する")').click();

    await waitForCondition(async () => {
      const rows = await dbGet<{ notify_overdue_actions: boolean; notify_frequency: string }[]>(
        `users?id=eq.${adminUserId}&select=notify_overdue_actions,notify_frequency`
      );
      return rows[0]?.notify_overdue_actions === false && rows[0]?.notify_frequency === "weekly";
    });

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.locator('input[name="notify_overdue_actions"]')).not.toBeChecked();
    await expect(page.locator('select[name="notify_frequency"]')).toHaveValue("weekly");
  });
});
