export const REGISTRY_PAGE_SIZE = 25;

export type RegistryCursor = { primary: string; secondary?: string; id: string };

export function encodeRegistryCursor(cursor: RegistryCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeRegistryCursor(value?: string): RegistryCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<RegistryCursor>;
    return typeof parsed.primary === "string" && typeof parsed.id === "string" && (parsed.secondary === undefined || typeof parsed.secondary === "string")
      ? { primary: parsed.primary, secondary: parsed.secondary, id: parsed.id }
      : null;
  } catch { return null; }
}

export function registrySearchParam(value: string | string[] | undefined, maxLength = 100) {
  return (Array.isArray(value) ? value[0] : value ?? "").trim().slice(0, maxLength);
}
