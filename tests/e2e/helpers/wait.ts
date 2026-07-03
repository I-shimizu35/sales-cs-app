import fs from "fs";

/**
 * Windowsではブラウザがアップロード直後まで一時ファイルのハンドルを保持していることがあり、
 * fs.unlinkSyncが数百ms程度 EBUSY で失敗することがある。数回リトライしてから諦める。
 */
export async function safeUnlink(filePath: string, retries = 5, delayMs = 300): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      fs.unlinkSync(filePath);
      return;
    } catch (e) {
      if (i === retries - 1) {
        console.warn(`一時ファイルの削除に失敗しました(無視して続行): ${filePath}`, e);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Server Action経由の更新はページ遷移を伴わないため、固定sleepでは
 * (特にNext.js devサーバーの初回コンパイル等で)反映前に判定してしまうことがある。
 * 期待する状態になるまでDBを軽くポーリングし、固定sleepより堅牢にする。
 */
export async function waitForCondition(
  check: () => Promise<boolean>,
  opts: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<void> {
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const intervalMs = opts.intervalMs ?? 500;
  const start = Date.now();
  for (;;) {
    if (await check()) return;
    if (Date.now() - start >= timeoutMs) {
      throw new Error(`waitForCondition timed out after ${timeoutMs}ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
