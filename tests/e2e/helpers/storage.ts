import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "./env";

const headers = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

/** テストでアップロードした添付ファイルを、指定バケット/プレフィックス配下から一括削除する。 */
export async function cleanupStoragePrefix(bucket: string, prefix: string): Promise<void> {
  const listRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ prefix }),
  });
  const files = (await listRes.json()) as { name: string }[];
  if (!Array.isArray(files) || files.length === 0) return;

  const prefixes = files.map((f) => `${prefix}${f.name}`);
  await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers,
    body: JSON.stringify({ prefixes }),
  });
}
