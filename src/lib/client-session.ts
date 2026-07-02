/**
 * クライアントポータル用の独自セッション。Supabase Authとは完全に別経路で、
 * companies.client_password_hash と照合したのち、companyIdを含む署名付きCookie値を発行する。
 * middleware(Edge Runtime)からも呼ばれるため、Node専用の"crypto"モジュールは使えない。
 * Edge/Node両方で使えるWeb Crypto API(globalThis.crypto.subtle)のみで実装する。
 */

const COOKIE_NAME = "client_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30日

function getSecret(): string {
  const secret = process.env.CLIENT_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "CLIENT_SESSION_SECRETが設定されていません。.env.localに追加してください。"
    );
  }
  return secret;
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getHmacKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function sign(payload: string): Promise<string> {
  const key = await getHmacKey();
  const enc = new TextEncoder();
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return toHex(signature);
}

export async function createClientSessionCookieValue(companyId: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${companyId}.${expiresAt}`;
  const signature = await sign(payload);
  return `${payload}.${signature}`;
}

export async function verifyClientSessionCookieValue(
  cookieValue: string | undefined
): Promise<string | null> {
  if (!cookieValue) return null;
  const parts = cookieValue.split(".");
  if (parts.length !== 3) return null;
  const [companyId, expiresAtStr, signature] = parts;
  const payload = `${companyId}.${expiresAtStr}`;
  const expectedSignature = await sign(payload);

  // 定数時間比較(Web Crypto APIには専用ヘルパーが無いため手動実装)
  if (signature.length !== expectedSignature.length) return null;
  let diff = 0;
  for (let i = 0; i < signature.length; i++) {
    diff |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  if (diff !== 0) return null;

  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  return companyId;
}

export const CLIENT_SESSION_COOKIE_NAME = COOKIE_NAME;
export const CLIENT_SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;
