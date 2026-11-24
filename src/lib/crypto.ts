import crypto from "crypto";

export function generateId(byteLength = 6): string {
  return crypto.randomBytes(byteLength).toString("base64url");
}

export function generateSecretToken(): string {
  return crypto.randomBytes(14).toString("base64url");
}

export function hashSecret(plain: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(plain, salt, 32).toString("hex");
  return `${salt}:${derived}`;
}

export function verifySecret(plain: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  const derived = crypto.scryptSync(plain, salt, 32);
  const keyBuf = Buffer.from(keyHex, "hex");
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function signAdminCookie(signingKey: string): string {
  const payload = `admin:${Date.now()}`;
  const sig = crypto
    .createHmac("sha256", signingKey)
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyAdminCookie(
  cookieValue: string | undefined,
  signingKey: string
): boolean {
  if (!cookieValue) return false;
  const dotIdx = cookieValue.lastIndexOf(".");
  if (dotIdx === -1) return false;
  const payload = cookieValue.slice(0, dotIdx);
  const sig = cookieValue.slice(dotIdx + 1);
  if (!payload.startsWith("admin:")) return false;

  const expected = crypto
    .createHmac("sha256", signingKey)
    .update(payload)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

