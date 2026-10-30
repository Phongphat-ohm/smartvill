import "server-only";

import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type AuthenticatedProfile = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  roleId: string;
  isActive: boolean;
  permissionKeys: string[];
};

export async function getAuthenticatedProfile(): Promise<AuthenticatedProfile | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) { await logDataError("auth.session.get_user", error); return null; }
  if (!data.user) return null;
  let profile;
  try {
    profile = await prisma.profile.findUnique({
      where: { id: data.user.id },
      include: { role: { include: { permissions: { select: { permissionKey: true } } } } },
    });
  } catch (dataError) {
    await logDataError("auth.profile.load", dataError);
    throw dataError;
  }
  if (!profile?.isActive) return null;
  return {
    id: profile.id,
    username: profile.username,
    email: profile.email,
    displayName: profile.displayName,
    roleId: profile.roleId,
    isActive: profile.isActive,
    permissionKeys: profile.role.permissions.map(({ permissionKey }) => permissionKey),
  };
}

export async function hasPermission(permissionKey: string, profile?: AuthenticatedProfile | null) {
  const current = profile === undefined ? await getAuthenticatedProfile() : profile;
  return Boolean(current && (current.roleId === "system_admin" || current.permissionKeys.includes(permissionKey)));
}

export async function currentUserWithPermission(permissionKey: string) {
  const profile = await getAuthenticatedProfile();
  return { profile, allowed: await hasPermission(permissionKey, profile) };
}

export async function getRequestId() {
  const requestHeaders = await headers();
  const supplied = requestHeaders.get("x-request-id")?.trim();
  return supplied && /^[\w.-]{1,100}$/.test(supplied) ? supplied : randomUUID();
}

export async function logDataError(operation: string, error: unknown, requestId?: string) {
  const id = requestId ?? await getRequestId();
  const value = error as { code?: unknown; name?: unknown; message?: unknown; meta?: { code?: unknown } } | null;
  const safeDomainCode = typeof value?.message === "string" && /^[A-Z][A-Z0-9_]{2,80}$/.test(value.message) ? value.message : undefined;
  const code = typeof value?.code === "string" ? value.code : typeof value?.meta?.code === "string" ? value.meta.code : safeDomainCode ?? "UNKNOWN";
  const name = typeof value?.name === "string" ? value.name : "Error";
  // Database messages can include user data and query values; log only error class and code.
  console.error(JSON.stringify({ level: "error", event: "data_access_failed", operation, requestId: id, errorName: name, errorCode: code }));
  return id;
}

export async function writeAudit(
  tx: Prisma.TransactionClient,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  changes?: unknown,
  reason?: string,
) {
  const requestId = await getRequestId();
  await tx.auditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      changes: changes === undefined ? undefined : JSON.parse(JSON.stringify(changes)),
      reason: reason ?? null,
      requestId,
    },
  });
}
