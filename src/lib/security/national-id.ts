import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto";

function masterKey() {
  const value = process.env.NATIONAL_ID_ENCRYPTION_KEY;
  if (!value) throw new Error("NATIONAL_ID_ENCRYPTION_KEY is not configured.");
  const key = /^[\da-f]{64}$/i.test(value) ? Buffer.from(value, "hex") : Buffer.from(value, "base64");
  if (key.length !== 32) throw new Error("NATIONAL_ID_ENCRYPTION_KEY must encode exactly 32 bytes.");
  return key;
}

function deriveKey(context: string) {
  return Buffer.from(hkdfSync("sha256", masterKey(), Buffer.alloc(0), `smartvill/${context}/v1`, 32));
}

export function encryptNationalId(nationalId: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey("national-id-encryption"), iv);
  const encrypted = Buffer.concat([cipher.update(nationalId, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function nationalIdLookupHash(nationalId: string) {
  return createHmac("sha256", deriveKey("national-id-index")).update(nationalId).digest("hex");
}

export function decryptNationalId(value: string) {
  const [version, iv, tag, encrypted] = value.split(":");
  if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Encrypted national ID format is invalid.");
  const instance = createDecipheriv("aes-256-gcm", deriveKey("national-id-encryption"), Buffer.from(iv, "base64url"));
  instance.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([instance.update(Buffer.from(encrypted, "base64url")), instance.final()]).toString("utf8");
}
