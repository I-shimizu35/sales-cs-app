/**
 * 本番相当のSupabase Authに実在するadmin(手動テストでも継続的に使用しているアカウント)。
 * 環境依存にしたい場合はE2E_ADMIN_EMAILで上書きできる。
 */
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "ibuki_shimizu@aidma-hd.jp";
