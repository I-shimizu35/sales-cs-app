import { test, expect } from "@playwright/test";
import { loginAsStaff } from "./helpers/session";
import { ADMIN_EMAIL } from "./helpers/constants";

test.describe("認証・セッションmiddleware", () => {
  test("未ログイン状態で / にアクセスすると /login にリダイレクトされる", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("未ログイン状態で /companies にアクセスすると /login にリダイレクトされる", async ({ page }) => {
    await page.goto("/companies");
    await expect(page).toHaveURL(/\/login/);
  });

  test("ログイン済みadminは主要画面にアクセスできる", async ({ page, context }) => {
    await loginAsStaff(context, ADMIN_EMAIL);

    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/);

    await page.goto("/companies");
    await expect(page).not.toHaveURL(/\/login/);

    await page.goto("/reports");
    await expect(page).not.toHaveURL(/\/login/);
  });
});
