import fs from "fs";
import path from "path";
import os from "os";
import { test, expect } from "@playwright/test";
import { loginAsStaff } from "./helpers/session";
import { createTestCompany, dbInsert, dbGet, dbDelete } from "./helpers/db";
import { cleanupStoragePrefix } from "./helpers/storage";
import { safeUnlink, waitForCondition } from "./helpers/wait";
import { ADMIN_EMAIL } from "./helpers/constants";

test.describe("脆弱性対策の回帰テスト", () => {
  let companyId: string;
  let dealId: string;

  test.beforeAll(async () => {
    const company = await createTestCompany("security");
    companyId = company.id;
    const deal = await dbInsert<{ id: string }>("deals", {
      company_id: companyId,
      title: "A",
      stage: "proposal",
    });
    dealId = deal.id;
  });

  test.afterAll(async () => {
    await cleanupStoragePrefix("deal-documents", `${companyId}/${dealId}/`);
    await dbDelete(`action_items?deal_id=eq.${dealId}`);
    await dbDelete(`deals?id=eq.${dealId}`);
    await dbDelete(`companies?id=eq.${companyId}`);
  });

  test("CSVエクスポートで数式インジェクションペイロードがサニタイズされる(CWE-1236)", async ({
    page,
    context,
  }) => {
    await loginAsStaff(context, ADMIN_EMAIL);
    await page.goto(`/companies/${companyId}/workspace/deals`);
    await page.waitForLoadState("networkidle");

    const payloadTitle = "=cmd|'/c calc'!A1";
    const firstRow = page.locator("table tbody tr").first();
    await firstRow.locator('input[name="title"]').fill(payloadTitle);
    await firstRow.locator('button:has-text("更新")').click();

    await waitForCondition(async () => {
      const deal = await dbGet<{ title: string }[]>(`deals?id=eq.${dealId}&select=title`);
      return deal[0]?.title === payloadTitle;
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator('button:has-text("CSVダウンロード")').click(),
    ]);
    const dlPath = await download.path();
    const text = fs.readFileSync(dlPath as string, "utf8").replace(/^﻿/, "");
    expect(text).toContain("'=cmd|");
  });

  test("許可されていない拡張子(.html)の添付ファイルアップロードは拒否される", async ({
    page,
    context,
  }) => {
    await loginAsStaff(context, ADMIN_EMAIL);
    await page.goto(`/companies/${companyId}/workspace/deals`);
    await page.waitForLoadState("networkidle");

    const firstRow = page.locator("table tbody tr").first();
    const urlInputs = firstRow.locator('input[placeholder="URL"]');
    const uploadButton = urlInputs.last().locator("xpath=..").locator("button").first();

    const badFilePath = path.join(os.tmpdir(), `e2e-malicious-${Date.now()}.html`);
    fs.writeFileSync(badFilePath, "<html><body><script>alert(1)</script></body></html>");

    let dialogMessage: string | null = null;
    page.once("dialog", async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    const [fileChooser] = await Promise.all([page.waitForEvent("filechooser"), uploadButton.click()]);
    await fileChooser.setFiles(badFilePath);
    await waitForCondition(async () => dialogMessage !== null, { timeoutMs: 10_000 });
    await safeUnlink(badFilePath);

    const after = await dbGet<{ quote_doc_url: string | null }[]>(
      `deals?id=eq.${dealId}&select=quote_doc_url`
    );
    expect(after[0].quote_doc_url).toBeNull();
    expect(dialogMessage).toContain("この形式のファイルはアップロードできません");
  });

  test("許可された拡張子(.pdf)のアップロードは成功し、署名URLがダウンロード強制・contentType固定になる", async ({
    page,
    context,
  }) => {
    await loginAsStaff(context, ADMIN_EMAIL);
    await page.goto(`/companies/${companyId}/workspace/deals`);
    await page.waitForLoadState("networkidle");

    const firstRow = page.locator("table tbody tr").first();
    const urlInputs = firstRow.locator('input[placeholder="URL"]');
    const uploadButton = urlInputs.last().locator("xpath=..").locator("button").first();

    const goodFilePath = path.join(os.tmpdir(), `e2e-quote-${Date.now()}.pdf`);
    fs.writeFileSync(goodFilePath, "%PDF-1.4 fake pdf content for e2e test\n");

    const [fileChooser] = await Promise.all([page.waitForEvent("filechooser"), uploadButton.click()]);
    await fileChooser.setFiles(goodFilePath);

    let quoteDocUrl: string | null = null;
    await waitForCondition(async () => {
      const after = await dbGet<{ quote_doc_url: string | null }[]>(
        `deals?id=eq.${dealId}&select=quote_doc_url`
      );
      quoteDocUrl = after[0]?.quote_doc_url ?? null;
      return !!quoteDocUrl && quoteDocUrl.includes(".pdf");
    });
    await safeUnlink(goodFilePath);

    expect(quoteDocUrl).toContain(".pdf");
    if (!quoteDocUrl) throw new Error("quoteDocUrl is unexpectedly null");

    const signedRes = await fetch(quoteDocUrl, { redirect: "follow" });
    expect(signedRes.headers.get("content-disposition")?.toLowerCase()).toContain("attachment");
    expect(signedRes.headers.get("content-type")).toBe("application/octet-stream");
  });
});
