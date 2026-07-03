import { cleanupTestCompanies } from "./helpers/db";

/**
 * 各specは自身が作った企業をafterAllで削除するが、途中でクラッシュした場合の
 * 取りこぼしに備えて、全テスト終了後に"E2E_"接頭辞の企業を一括削除する保険をかける。
 */
export default async function globalTeardown(): Promise<void> {
  await cleanupTestCompanies();
}
