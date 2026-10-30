"use server";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, type Prisma as PrismaTypes } from "@prisma/client";
import { deceasedResidentSchema, householdSchema, householdUpdateSchema, meterReadingSchema, paymentSchema, residentSchema, residentUpdateSchema, residencyChangeSchema } from "@/lib/validations";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { decryptNationalId, encryptNationalId, nationalIdLookupHash } from "@/lib/security/national-id";
import { currentUserWithPermission, logDataError, writeAudit } from "@/lib/data-access";
import { prisma } from "@/lib/prisma";

export type ActionState = { ok: boolean; message: string; code?: string };

const runtimeBigInt = (globalThis as typeof globalThis & { BigInt: (value: number) => bigint }).BigInt;

async function authorized(permission: string) {
  if (!isSupabaseConfigured()) return { profile: null, allowed: false };
  return currentUserWithPermission(permission);
}

async function errorResult(operation: string, error: unknown, message: string): Promise<ActionState> {
  const requestId = await logDataError(operation, error);
  return { ok: false, message: `${message} (รหัสอ้างอิง ${requestId})`, code: requestId };
}

function dateOnly(value: string) { return new Date(`${value}T00:00:00.000Z`); }
function documentNumber(prefix: string, value: bigint) {
  const year = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", year: "numeric" }).format(new Date());
  return `${prefix}${String(Number(year) + 543).slice(-2)}${String(value).padStart(6, "0")}`;
}
async function allocateNumber(tx: PrismaTypes.TransactionClient, key: string, prefix: string) {
  const sequence = await tx.numberSequence.upsert({ where: { key }, create: { key, prefix, nextValue: runtimeBigInt(2) }, update: { nextValue: { increment: runtimeBigInt(1) } }, select: { nextValue: true } });
  return documentNumber(prefix, sequence.nextValue - runtimeBigInt(1));
}
async function serializable<T>(work: (tx: PrismaTypes.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try { return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 30_000 }); }
    catch (error) { if (attempt >= 2 || !(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034") throw error; }
  }
}

export async function createHouseholdAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = householdSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  const { profile, allowed } = await authorized("registry.household.create");
  if (!allowed || !profile) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์เพิ่มครัวเรือน" };
  try {
    await prisma.$transaction(async (tx) => {
      const household = await tx.household.create({ data: { houseNumber: parsed.data.houseNumber, moo: parsed.data.moo, road: parsed.data.road || null, subdistrict: parsed.data.subdistrict, district: parsed.data.district, province: parsed.data.province, postalCode: parsed.data.postalCode, householdType: parsed.data.type.toUpperCase() as "RESIDENTIAL" | "COMMERCIAL" | "MIXED", occupancyStatus: "VACANT" } });
      await writeAudit(tx, profile.id, "create", "households", household.id, { houseNumber: household.houseNumber, moo: household.moo });
    });
    revalidatePath("/households");
    return { ok: true, message: "เพิ่มครัวเรือนแล้ว" };
  } catch (error) { return errorResult("households.create", error, "บันทึกครัวเรือนไม่สำเร็จ"); }
}
export async function createHouseholdFormAction(formData: FormData) { return createHouseholdAction({ ok: false, message: "" }, formData); }

export async function updateHouseholdAction(formData: FormData): Promise<ActionState> {
  const parsed = householdUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  const { profile, allowed } = await authorized("registry.household.update");
  if (!allowed || !profile) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์แก้ไขครัวเรือน" };
  const value = parsed.data;
  if (value.occupancyStatus === "archived") return { ok: false, message: "ใช้คำสั่งเก็บประวัติครัวเรือนเพื่อปิดสถานะ" };
  try {
    await prisma.$transaction(async (tx) => {
      const before = await tx.household.findUniqueOrThrow({ where: { id: value.id } });
      const updated = await tx.household.update({ where: { id: value.id }, data: { houseNumber: value.houseNumber, moo: value.moo, road: value.road || null, subdistrict: value.subdistrict, district: value.district, province: value.province, postalCode: value.postalCode, householdType: value.type.toUpperCase() as "RESIDENTIAL" | "COMMERCIAL" | "MIXED", occupancyStatus: value.occupancyStatus.toUpperCase() as "OCCUPIED" | "VACANT", note: value.note || null } });
      await writeAudit(tx, profile.id, "update", "households", updated.id, { before: { houseNumber: before.houseNumber, moo: before.moo, occupancyStatus: before.occupancyStatus }, after: { houseNumber: updated.houseNumber, moo: updated.moo, occupancyStatus: updated.occupancyStatus } });
    });
    const persisted = await prisma.household.findUnique({ where: { id: value.id }, select: { houseNumber: true, moo: true, road: true, subdistrict: true, district: true, province: true, postalCode: true, householdType: true, occupancyStatus: true, note: true } });
    if (!persisted || persisted.houseNumber !== value.houseNumber || persisted.moo !== value.moo || persisted.road !== (value.road || null) || persisted.subdistrict !== value.subdistrict || persisted.district !== value.district || persisted.province !== value.province || persisted.postalCode !== value.postalCode || persisted.householdType !== value.type.toUpperCase() || persisted.occupancyStatus !== value.occupancyStatus.toUpperCase() || persisted.note !== (value.note || null)) throw new Error("HOUSEHOLD_UPDATE_NOT_PERSISTED");
    revalidatePath("/households"); revalidatePath(`/households/${value.id}`);
    return { ok: true, message: "บันทึกข้อมูลครัวเรือนแล้ว" };
  } catch (error) { return errorResult("households.update", error, "แก้ไขครัวเรือนไม่สำเร็จ ตรวจสอบบ้านเลขที่ซ้ำและสถานะ"); }
}

export async function archiveHouseholdAction(formData: FormData): Promise<ActionState> {
  const householdId = String(formData.get("householdId") ?? ""); const reason = String(formData.get("reason") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(householdId) || reason.length < 3) return { ok: false, message: "ระบุเหตุผลอย่างน้อย 3 ตัวอักษร" };
  const { profile, allowed } = await authorized("registry.household.update");
  if (!allowed || !profile) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์เก็บประวัติครัวเรือน" };
  try {
    await prisma.$transaction(async (tx) => {
      const [members, connections] = await Promise.all([tx.householdMembership.count({ where: { householdId, moveOutAt: null } }), tx.waterConnection.count({ where: { householdId, status: "ACTIVE" } })]);
      if (members || connections) throw new Error("HOUSEHOLD_HAS_ACTIVE_RECORDS");
      const result = await tx.household.updateMany({ where: { id: householdId, occupancyStatus: { not: "ARCHIVED" } }, data: { occupancyStatus: "ARCHIVED" } });
      if (!result.count) throw new Error("HOUSEHOLD_NOT_FOUND_OR_ARCHIVED");
      await writeAudit(tx, profile.id, "archive", "households", householdId, undefined, reason);
    });
    revalidatePath("/households"); revalidatePath(`/households/${householdId}`);
    return { ok: true, message: "เก็บประวัติครัวเรือนแล้ว" };
  } catch (error) { return errorResult("households.archive", error, "เก็บประวัติไม่ได้: ตรวจสอบสมาชิกและจุดใช้น้ำที่ยังใช้งาน"); }
}

export async function createResidentAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = residentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  const { profile, allowed } = await authorized("registry.resident.create");
  if (!allowed || !profile) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์เพิ่มข้อมูลประชากร" };
  let ciphertext: string | null = null; let hash: string | null = null;
  try { if (parsed.data.nationalId) { ciphertext = encryptNationalId(parsed.data.nationalId); hash = nationalIdLookupHash(parsed.data.nationalId); } }
  catch (error) { await logDataError("people.national_id.encrypt", error); return { ok: false, message: "ระบบเข้ารหัสเลขบัตรยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแล" }; }
  try {
    await serializable(async (tx) => {
      const household = await tx.household.findUnique({ where: { id: parsed.data.householdId }, select: { id: true, occupancyStatus: true } });
      if (!household || household.occupancyStatus === "ARCHIVED") throw new Error("HOUSEHOLD_UNAVAILABLE");
      const isHead = parsed.data.relationship === "หัวหน้าครัวเรือน";
      if (isHead && await tx.householdMembership.findFirst({ where: { householdId: household.id, isHead: true, moveOutAt: null } })) throw new Error("HOUSEHOLD_ALREADY_HAS_HEAD");
      const resident = await tx.resident.create({ data: { firstName: parsed.data.firstName, lastName: parsed.data.lastName, nationalIdCiphertext: ciphertext, nationalIdLookupHash: hash, birthDate: parsed.data.birthDate ? dateOnly(parsed.data.birthDate) : null, phone: parsed.data.phone || null, residencyStatus: "RESIDENT", memberships: { create: { householdId: household.id, relationship: parsed.data.relationship, isHead, moveInAt: dateOnly(new Date().toISOString().slice(0, 10)) } } } });
      if (isHead) await tx.householdHeadHistory.create({ data: { householdId: household.id, residentId: resident.id, startedAt: dateOnly(new Date().toISOString().slice(0, 10)), reason: "กำหนดเป็นเจ้าบ้านเมื่อเพิ่มประชากร", changedBy: profile.id } });
      await tx.household.update({ where: { id: household.id }, data: { occupancyStatus: "OCCUPIED" } });
      await writeAudit(tx, profile.id, "create", "residents", resident.id, { firstName: resident.firstName, lastName: resident.lastName });
    });
    revalidatePath("/people"); revalidatePath("/households");
    return { ok: true, message: "เพิ่มข้อมูลประชากรแล้ว" };
  } catch (error) { return errorResult("people.create", error, "บันทึกข้อมูลไม่สำเร็จ ตรวจสอบครัวเรือน หัวหน้าครัวเรือน และเลขบัตรซ้ำ"); }
}
export async function createResidentFormAction(formData: FormData) { return createResidentAction({ ok: false, message: "" }, formData); }

export async function updateResidentAction(formData: FormData): Promise<ActionState> {
  const parsed = residentUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  const { profile, allowed } = await authorized("registry.resident.update");
  if (!allowed || !profile) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์แก้ไขข้อมูลประชากร" };
  let ciphertext: string | null = null; let hash: string | null = null;
  try { if (parsed.data.nationalId) { ciphertext = encryptNationalId(parsed.data.nationalId); hash = nationalIdLookupHash(parsed.data.nationalId); } }
  catch (error) { await logDataError("people.national_id.encrypt", error); return { ok: false, message: "ระบบเข้ารหัสเลขบัตรยังไม่ได้ตั้งค่า" }; }
  try {
    await prisma.$transaction(async (tx) => {
      const before = await tx.resident.findUniqueOrThrow({ where: { id: parsed.data.id }, select: { firstName: true, lastName: true } });
      const resident = await tx.resident.update({ where: { id: parsed.data.id }, data: { firstName: parsed.data.firstName, lastName: parsed.data.lastName, birthDate: parsed.data.birthDate ? dateOnly(parsed.data.birthDate) : null, phone: parsed.data.phone || null, ...(parsed.data.nationalId ? { nationalIdCiphertext: ciphertext, nationalIdLookupHash: hash } : {}) } });
      await writeAudit(tx, profile.id, "update", "residents", resident.id, { before, after: { firstName: resident.firstName, lastName: resident.lastName } });
    });
    const persisted = await prisma.resident.findUnique({ where: { id: parsed.data.id }, select: { firstName: true, lastName: true, birthDate: true, phone: true } });
    if (!persisted || persisted.firstName !== parsed.data.firstName || persisted.lastName !== parsed.data.lastName || (persisted.birthDate?.toISOString().slice(0, 10) ?? "") !== (parsed.data.birthDate || "") || persisted.phone !== (parsed.data.phone || null)) throw new Error("RESIDENT_UPDATE_NOT_PERSISTED");
    revalidatePath("/people"); revalidatePath(`/people/${parsed.data.id}`);
    return { ok: true, message: "บันทึกข้อมูลประชากรแล้ว" };
  } catch (error) { return errorResult("people.update", error, "แก้ไขข้อมูลประชากรไม่สำเร็จ ตรวจสอบเลขบัตรไม่ซ้ำ"); }
}

export async function changeResidencyAction(formData: FormData): Promise<ActionState> {
  const parsed = residencyChangeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลการย้ายไม่ถูกต้อง" };
  const { profile, allowed } = await authorized("registry.resident.update");
  if (!allowed || !profile) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์ย้ายทะเบียนประชากร" };
  const value = parsed.data; const moveDate = dateOnly(value.changeDate); const destinationId = value.destinationHouseholdId || null;
  try {
    await serializable(async (tx) => {
      const resident = await tx.resident.findUnique({ where: { id: value.residentId }, select: { residencyStatus: true } });
      if (!resident || resident.residencyStatus === "DECEASED") throw new Error("DECEASED_RESIDENT_CANNOT_MOVE");
      const active = await tx.householdMembership.findFirst({ where: { residentId: value.residentId, moveOutAt: null }, orderBy: { moveInAt: "desc" } });
      if (!active && !destinationId) throw new Error("RESIDENT_HAS_NO_CURRENT_HOUSEHOLD");
      if (active && moveDate < active.moveInAt) throw new Error("MOVE_DATE_BEFORE_MOVE_IN");
      if (active && destinationId === active.householdId) throw new Error("SAME_HOUSEHOLD");
      if (!active) {
        const previous = await tx.householdMembership.findFirst({ where: { residentId: value.residentId, moveOutAt: { not: null } }, orderBy: { moveOutAt: "desc" }, select: { moveOutAt: true } });
        if (previous?.moveOutAt && moveDate < previous.moveOutAt) throw new Error("MOVE_DATE_BEFORE_LAST_MOVE_OUT");
      }
      if (destinationId) {
        const destination = await tx.household.findUnique({ where: { id: destinationId }, select: { occupancyStatus: true } });
        if (!destination || destination.occupancyStatus === "ARCHIVED") throw new Error("HOUSEHOLD_UNAVAILABLE");
        if (value.relationship === "หัวหน้าครัวเรือน" && await tx.householdMembership.findFirst({ where: { householdId: destinationId, isHead: true, moveOutAt: null } })) throw new Error("HOUSEHOLD_ALREADY_HAS_HEAD");
      }
      if (active) {
        await tx.householdMembership.update({ where: { id: active.id }, data: { moveOutAt: moveDate, moveReason: value.reason } });
        if (active.isHead) await tx.householdHeadHistory.updateMany({ where: { householdId: active.householdId, residentId: value.residentId, endedAt: null }, data: { endedAt: moveDate } });
      }
      if (destinationId) await tx.householdMembership.create({ data: { residentId: value.residentId, householdId: destinationId, relationship: value.relationship, isHead: value.relationship === "หัวหน้าครัวเรือน", moveInAt: moveDate } });
      if (destinationId && value.relationship === "หัวหน้าครัวเรือน") await tx.householdHeadHistory.create({ data: { householdId: destinationId, residentId: value.residentId, startedAt: moveDate, reason: value.reason, changedBy: profile.id } });
      await tx.resident.update({ where: { id: value.residentId }, data: { residencyStatus: destinationId ? "MOVED_IN" : "MOVED_OUT" } });
      if (active) {
        const remainingMembers = await tx.householdMembership.count({ where: { householdId: active.householdId, moveOutAt: null } });
        await tx.household.updateMany({ where: { id: active.householdId, occupancyStatus: { not: "ARCHIVED" } }, data: { occupancyStatus: remainingMembers ? "OCCUPIED" : "VACANT" } });
      }
      if (destinationId) await tx.household.update({ where: { id: destinationId }, data: { occupancyStatus: "OCCUPIED" } });
      await writeAudit(tx, profile.id, destinationId ? "move_in" : "move_out", "residents", value.residentId, { destinationHouseholdId: destinationId }, value.reason);
    });
    revalidatePath("/people"); revalidatePath(`/people/${value.residentId}`); revalidatePath("/households");
    return { ok: true, message: destinationId ? "ย้ายเข้าครัวเรือนใหม่แล้ว" : "บันทึกการย้ายออกแล้ว" };
  } catch (error) { return errorResult("people.change_residency", error, "ย้ายทะเบียนไม่สำเร็จ ตรวจสอบวันย้าย ครัวเรือนปลายทาง และสถานะหัวหน้าครัวเรือน"); }
}

export async function setHouseholdHeadAction(formData: FormData): Promise<ActionState> {
  const householdId = String(formData.get("householdId") ?? ""); const residentId = String(formData.get("residentId") ?? ""); const reason = String(formData.get("reason") ?? "").trim(); const effectiveDate = String(formData.get("effectiveDate") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(householdId) || !/^[0-9a-f-]{36}$/i.test(residentId) || reason.length < 3 || !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) return { ok: false, message: "ระบุผู้รับตำแหน่ง วันที่มีผล และเหตุผลอย่างน้อย 3 ตัวอักษร" };
  const { profile, allowed } = await authorized("registry.resident.update");
  if (!allowed || !profile) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์เปลี่ยนหัวหน้าครัวเรือน" };
  try {
    await serializable(async (tx) => {
      const membership = await tx.householdMembership.findFirst({ where: { householdId, residentId, moveOutAt: null } });
      if (!membership) throw new Error("RESIDENT_NOT_ACTIVE_MEMBER");
      const effectiveAt = dateOnly(effectiveDate);
      if (effectiveAt < membership.moveInAt) throw new Error("HEAD_DATE_BEFORE_MOVE_IN");
      await tx.householdHeadHistory.updateMany({ where: { householdId, endedAt: null }, data: { endedAt: effectiveAt } });
      await tx.householdMembership.updateMany({ where: { householdId, moveOutAt: null, isHead: true }, data: { isHead: false } });
      await tx.householdMembership.update({ where: { id: membership.id }, data: { isHead: true, relationship: "หัวหน้าครัวเรือน" } });
      await tx.householdHeadHistory.create({ data: { householdId, residentId, startedAt: effectiveAt, reason, changedBy: profile.id } });
      await writeAudit(tx, profile.id, "set_household_head", "household_memberships", membership.id, { householdId, residentId }, reason);
    });
    revalidatePath("/households"); revalidatePath(`/households/${householdId}`); revalidatePath("/people"); revalidatePath(`/people/${residentId}`);
    return { ok: true, message: "เปลี่ยนหัวหน้าครัวเรือนแล้ว" };
  } catch (error) { return errorResult("households.set_head", error, "เปลี่ยนหัวหน้าครัวเรือนไม่สำเร็จ ตรวจสอบสมาชิกปัจจุบันของบ้าน"); }
}

export async function markResidentDeceasedAction(formData: FormData): Promise<ActionState> {
  const parsed = deceasedResidentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลการเสียชีวิตไม่ถูกต้อง" };
  const { profile, allowed } = await authorized("registry.resident.update");
  if (!allowed || !profile) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์เปลี่ยนสถานะประชากร" };
  const deathDate = dateOnly(parsed.data.deceasedAt);
  try {
    await serializable(async (tx) => {
      const resident = await tx.resident.findUnique({ where: { id: parsed.data.residentId }, select: { birthDate: true, residencyStatus: true } });
      if (!resident) throw new Error("RESIDENT_NOT_FOUND");
      if (resident.residencyStatus === "DECEASED") throw new Error("RESIDENT_ALREADY_DECEASED");
      if (resident.birthDate && deathDate < resident.birthDate) throw new Error("DEATH_DATE_BEFORE_BIRTH");
      const active = await tx.householdMembership.findFirst({ where: { residentId: parsed.data.residentId, moveOutAt: null } });
      if (active && deathDate < active.moveInAt) throw new Error("DEATH_DATE_BEFORE_MOVE_IN");
      if (active) {
        await tx.householdMembership.update({ where: { id: active.id }, data: { moveOutAt: deathDate, moveReason: `เสียชีวิต: ${parsed.data.reason}` } });
        if (active.isHead) await tx.householdHeadHistory.updateMany({ where: { householdId: active.householdId, residentId: parsed.data.residentId, endedAt: null }, data: { endedAt: deathDate } });
        const remaining = await tx.householdMembership.count({ where: { householdId: active.householdId, moveOutAt: null } });
        await tx.household.updateMany({ where: { id: active.householdId, occupancyStatus: { not: "ARCHIVED" } }, data: { occupancyStatus: remaining ? "OCCUPIED" : "VACANT" } });
      }
      await tx.resident.update({ where: { id: parsed.data.residentId }, data: { residencyStatus: "DECEASED", deceasedAt: deathDate, deathReason: parsed.data.reason } });
      await writeAudit(tx, profile.id, "mark_deceased", "residents", parsed.data.residentId, { deceasedAt: parsed.data.deceasedAt, previousStatus: resident.residencyStatus }, parsed.data.reason);
    });
    revalidatePath("/people"); revalidatePath(`/people/${parsed.data.residentId}`); revalidatePath("/households"); revalidatePath("/registry/review");
    return { ok: true, message: "บันทึกสถานะเสียชีวิตและสิ้นสุดสมาชิกครัวเรือนแล้ว" };
  } catch (error) { return errorResult("people.mark_deceased", error, "บันทึกสถานะเสียชีวิตไม่สำเร็จ ตรวจสอบวันที่และสถานะปัจจุบัน"); }
}

export async function revealNationalIdAction(residentId: string): Promise<{ ok: boolean; message?: string; nationalId?: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(residentId)) return { ok: false, message: "ไม่พบรหัสประชากร" };
  const { profile, allowed } = await authorized("registry.resident.sensitive.read");
  if (!allowed || !profile) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์ดูเลขบัตรเต็ม" };
  try {
    const row = await prisma.resident.findUnique({ where: { id: residentId }, select: { nationalIdCiphertext: true } });
    if (!row?.nationalIdCiphertext) return { ok: false, message: "ไม่พบเลขบัตรหรือไม่สามารถเปิดดูได้" };
    await prisma.auditLog.create({ data: { actorId: profile.id, action: "sensitive_read", entityType: "residents", entityId: residentId, changes: { fields: ["nationalIdCiphertext"] }, reason: "ดูข้อมูลส่วนบุคคล", requestId: randomUUID() } });
    return { ok: true, nationalId: decryptNationalId(row.nationalIdCiphertext) };
  } catch (error) { await logDataError("people.national_id.reveal", error); return { ok: false, message: "ไม่สามารถเปิดดูเลขบัตรได้" }; }
}

export async function findResidentByNationalIdAction(nationalId: string): Promise<{ ok: boolean; message?: string; resident?: { id: string; name: string; household: string } }> {
  if (!/^\d{13}$/.test(nationalId)) return { ok: false, message: "กรอกเลขบัตรประชาชน 13 หลัก" };
  const { allowed } = await authorized("registry.resident.sensitive.read");
  if (!allowed) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์ค้นหาด้วยเลขบัตร" };
  try {
    const hash = nationalIdLookupHash(nationalId);
    const resident = await prisma.resident.findUnique({ where: { nationalIdLookupHash: hash }, select: { id: true, firstName: true, lastName: true, memberships: { where: { moveOutAt: null }, select: { household: { select: { houseNumber: true, moo: true } } }, take: 1 } } });
    if (!resident) return { ok: false, message: "ไม่พบประชากรจากเลขบัตรนี้" };
    const household = resident.memberships[0]?.household;
    return { ok: true, resident: { id: resident.id, name: `${resident.firstName} ${resident.lastName}`, household: household ? `บ้านเลขที่ ${household.houseNumber} หมู่ ${household.moo}` : "ไม่มีครัวเรือนปัจจุบัน" } };
  } catch (error) { const requestId = await logDataError("people.national_id.search", error); return { ok: false, message: `ค้นหาข้อมูลไม่สำเร็จ (รหัสอ้างอิง ${requestId})` }; }
}

export async function recordWaterReadingAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = meterReadingSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "เลขมิเตอร์ไม่ถูกต้อง" };
  const { profile, allowed } = await authorized("water.reading.create");
  if (!allowed || !profile) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์บันทึกเลขมิเตอร์" };
  try {
    await serializable(async (tx) => {
      const previous = await tx.meterReading.findFirst({ where: { meterId: parsed.data.meterId, readingDate: { lt: dateOnly(parsed.data.readingDate) } }, orderBy: { readingDate: "desc" }, select: { readingValue: true } });
      const settings = await tx.villageSettings.findUnique({ where: { id: 1 }, select: { maxMonthlyWaterUse: true } });
      const current = new Prisma.Decimal(parsed.data.readingValue);
      const previousValue = previous ? new Prisma.Decimal(previous.readingValue) : null;
      const usage = previousValue === null || current.lessThan(previousValue) ? null : current.minus(previousValue);
      const needsReview = previousValue !== null && (usage === null || usage.greaterThan(settings?.maxMonthlyWaterUse ?? 100));
      const reading = await tx.meterReading.create({ data: { meterId: parsed.data.meterId, readingDate: dateOnly(parsed.data.readingDate), readingValue: current, usage, status: needsReview ? "NEEDS_REVIEW" : "RECORDED", note: parsed.data.note || null, recordedBy: profile.id } });
      await writeAudit(tx, profile.id, "create", "meter_readings", reading.id, { meterId: reading.meterId, status: reading.status });
    });
    revalidatePath("/water/readings"); revalidatePath("/water/billing");
    return { ok: true, message: "บันทึกเลขมิเตอร์แล้ว" };
  } catch (error) { return errorResult("water.readings.create", error, "บันทึกเลขมิเตอร์ไม่สำเร็จ ตรวจสอบมิเตอร์และวันที่อ่านซ้ำ"); }
}
export async function recordWaterReadingFormAction(formData: FormData) { return recordWaterReadingAction({ ok: false, message: "" }, formData); }

export async function reviewWaterReadingAction(formData: FormData): Promise<ActionState> {
  const readingId = String(formData.get("readingId") ?? ""); const approved = formData.get("approved") === "true"; const reason = String(formData.get("reason") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(readingId) || reason.length < 3) return { ok: false, message: "ระบุรายการและเหตุผลตรวจสอบอย่างน้อย 3 ตัวอักษร" };
  const { profile, allowed } = await authorized("water.reading.review");
  if (!allowed || !profile) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์ตรวจสอบเลขมิเตอร์" };
  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.meterReading.findFirst({ where: { id: readingId, status: "NEEDS_REVIEW" }, select: { note: true } });
      if (!current) throw new Error("READING_NOT_AWAITING_REVIEW");
      const updated = await tx.meterReading.updateMany({ where: { id: readingId, status: "NEEDS_REVIEW" }, data: { status: approved ? "RECORDED" : "REJECTED", note: [current.note, `ผลตรวจ: ${approved ? "ยืนยัน" : "ปฏิเสธ"} · ${reason}`].filter(Boolean).join("\n"), reviewedBy: profile.id, reviewedAt: new Date() } });
      if (!updated.count) throw new Error("READING_NOT_AWAITING_REVIEW");
      await writeAudit(tx, profile.id, approved ? "approve" : "reject", "meter_readings", readingId, { approved }, reason);
    });
    revalidatePath("/water/readings"); revalidatePath("/water/billing");
    return { ok: true, message: approved ? "ยืนยันเลขมิเตอร์แล้ว" : "ปฏิเสธรายการและเก็บประวัติแล้ว" };
  } catch (error) { return errorResult("water.readings.review", error, "ตรวจสอบรายการไม่สำเร็จ รายการอาจถูกดำเนินการแล้ว"); }
}

export async function recordWaterPaymentAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "ยอดชำระไม่ถูกต้อง" };
  const { profile, allowed } = await authorized("water.payment.create");
  if (!allowed || !profile) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์บันทึกการรับชำระ" };
  try {
    const receipt = await serializable(async (tx) => {
      const invoice = await tx.waterInvoice.findUnique({ where: { id: parsed.data.invoiceId } });
      if (!invoice || ["VOID", "NEEDS_REVIEW"].includes(invoice.status)) throw new Error("INVOICE_CANNOT_BE_PAID");
      const amount = new Prisma.Decimal(parsed.data.amount);
      if (invoice.paidAmount.plus(amount).greaterThan(invoice.totalAmount)) throw new Error("PAYMENT_EXCEEDS_BALANCE");
      const receiptNumber = await allocateNumber(tx, "water_receipt", "WR");
      await tx.waterPayment.create({ data: { invoiceId: invoice.id, receiptNumber, amount, method: parsed.data.method.toUpperCase() as "CASH" | "TRANSFER" | "OTHER", reference: parsed.data.reference || null, receivedBy: profile.id } });
      await tx.waterInvoice.update({ where: { id: invoice.id }, data: { paidAmount: { increment: amount }, status: invoice.paidAmount.plus(amount).greaterThanOrEqualTo(invoice.totalAmount) ? "PAID" : "PARTIALLY_PAID" } });
      await writeAudit(tx, profile.id, "payment", "water_invoices", invoice.id, { amount: amount.toString(), receiptNumber });
      return receiptNumber;
    });
    revalidatePath("/water/billing");
    return { ok: true, message: `รับชำระแล้ว ใบเสร็จ ${receipt}` };
  } catch (error) { return errorResult("water.payment.create", error, "รับชำระไม่สำเร็จ ตรวจสอบยอดคงเหลือและสถานะใบแจ้งหนี้"); }
}
export async function recordWaterPaymentFormAction(formData: FormData) { return recordWaterPaymentAction({ ok: false, message: "" }, formData); }

export async function generateWaterInvoiceAction(readingId: string): Promise<ActionState> {
  if (!/^[0-9a-f-]{36}$/i.test(readingId)) return { ok: false, message: "ไม่พบรายการอ่านมิเตอร์" };
  const { profile, allowed } = await authorized("water.invoice.create");
  if (!allowed || !profile) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์ออกใบแจ้งหนี้" };
  try {
    await serializable(async (tx) => {
      const reading = await tx.meterReading.findUnique({ where: { id: readingId }, include: { meter: { include: { connection: true } } } });
      if (!reading || reading.status !== "RECORDED" || reading.usage === null) throw new Error("READING_NOT_VERIFIED");
      if (await tx.waterInvoice.findUnique({ where: { meterReadingId: reading.id } })) throw new Error("READING_ALREADY_BILLED");
      const [previous, tariff] = await Promise.all([
        tx.meterReading.findFirst({ where: { meterId: reading.meterId, readingDate: { lt: reading.readingDate } }, orderBy: { readingDate: "desc" }, select: { readingDate: true } }),
        tx.tariffPlan.findFirst({ where: { meterSizeMm: reading.meter.sizeMm, isActive: true, effectiveFrom: { lte: reading.readingDate }, OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: reading.readingDate } }] }, include: { tiers: { orderBy: { sortOrder: "asc" } } }, orderBy: { effectiveFrom: "desc" } }),
      ]);
      if (!tariff) throw new Error("TARIFF_NOT_FOUND");
      const usage = new Prisma.Decimal(reading.usage); let waterCost = new Prisma.Decimal(0); let unitRate = new Prisma.Decimal(0);
      if (tariff.mode === "FLAT") {
        if (!tariff.flatRatePerCubicMeter) throw new Error("TARIFF_RATE_MISSING");
        waterCost = usage.mul(tariff.flatRatePerCubicMeter).toDecimalPlaces(2); unitRate = tariff.flatRatePerCubicMeter;
      } else {
        let remaining = usage; let lowerBound = new Prisma.Decimal(0);
        for (const tier of tariff.tiers) {
          if (tier.upToCubicMeters === null) { waterCost = waterCost.plus(remaining.mul(tier.ratePerCubicMeter)); remaining = new Prisma.Decimal(0); }
          else { const width = new Prisma.Decimal(tier.upToCubicMeters).minus(lowerBound).clamp(0, remaining); waterCost = waterCost.plus(width.mul(tier.ratePerCubicMeter)); remaining = remaining.minus(width); lowerBound = new Prisma.Decimal(tier.upToCubicMeters); }
        }
        if (remaining.greaterThan(0)) throw new Error("TARIFF_TIERS_INCOMPLETE");
        waterCost = waterCost.toDecimalPlaces(2); unitRate = usage.equals(0) ? new Prisma.Decimal(0) : waterCost.div(usage).toDecimalPlaces(4);
      }
      const invoiceNumber = await allocateNumber(tx, "water_invoice", "WI");
      const serviceFee = new Prisma.Decimal(tariff.serviceFee);
      const periodStart = previous ? new Date(previous.readingDate.getTime() + 86_400_000) : new Date(Date.UTC(reading.readingDate.getUTCFullYear(), reading.readingDate.getUTCMonth(), 1));
      const dueDate = new Date(reading.readingDate.getTime() + tariff.dueDays * 86_400_000);
      const snapshot = { id: tariff.id, name: tariff.name, meterSizeMm: tariff.meterSizeMm, mode: tariff.mode.toLowerCase(), flatRatePerCubicMeter: tariff.flatRatePerCubicMeter?.toString() ?? null, serviceFee: serviceFee.toString(), dueDays: tariff.dueDays, tiers: tariff.tiers.map((tier) => ({ upToCubicMeters: tier.upToCubicMeters?.toString() ?? null, ratePerCubicMeter: tier.ratePerCubicMeter.toString(), sortOrder: tier.sortOrder })) };
      const invoice = await tx.waterInvoice.create({ data: { invoiceNumber, connectionId: reading.meter.connectionId, meterReadingId: reading.id, periodStart, periodEnd: reading.readingDate, dueDate, usage, serviceFee, totalAmount: waterCost.plus(serviceFee), tariffSnapshot: snapshot, lines: { create: [{ description: "ค่าน้ำประปา", quantity: usage, unitRate, amount: waterCost }, ...(serviceFee.greaterThan(0) ? [{ description: "ค่าบริการรายเดือน", quantity: new Prisma.Decimal(1), unitRate: serviceFee, amount: serviceFee }] : [])] } } });
      await writeAudit(tx, profile.id, "create_invoice", "water_invoices", invoice.id, { invoiceNumber, readingId });
    });
    revalidatePath("/water/billing"); revalidatePath("/water/readings");
    return { ok: true, message: "ออกใบแจ้งหนี้แล้ว" };
  } catch (error) { return errorResult("water.invoice.create", error, "ออกใบแจ้งหนี้ไม่สำเร็จ ตรวจสอบสถานะการอ่านและอัตราค่าน้ำที่มีผล"); }
}

export async function recordShopSaleAction(items: Array<{ productId: string; quantity: number }>, method: string): Promise<ActionState> {
  if (!Array.isArray(items) || items.length < 1 || items.length > 100 || items.some((item) => !/^[0-9a-f-]{36}$/i.test(item.productId) || !Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 10000) || !["cash", "transfer", "other"].includes(method)) return { ok: false, message: "ตรวจสอบรายการสินค้า จำนวน และช่องทางรับเงิน" };
  const { profile, allowed } = await authorized("store.sale.create");
  if (!allowed || !profile) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์บันทึกการขาย" };
  try {
    const receipt = await serializable(async (tx) => {
      const quantities = new Map<string, number>(); items.forEach(({ productId, quantity }) => quantities.set(productId, (quantities.get(productId) ?? 0) + quantity));
      const receiptNumber = await allocateNumber(tx, "shop_receipt", "SR");
      const sale = await tx.sale.create({ data: { receiptNumber, totalAmount: 0, paidAmount: 0, paymentMethod: method.toUpperCase() as "CASH" | "TRANSFER" | "OTHER", soldBy: profile.id } });
      let total = new Prisma.Decimal(0);
      for (const [productId, quantityValue] of quantities) {
        const product = await tx.product.findUnique({ where: { id: productId } });
        const quantity = new Prisma.Decimal(quantityValue);
        if (!product || product.status !== "ACTIVE" || product.stock.lessThan(quantity)) throw new Error("PRODUCT_UNAVAILABLE_OR_STOCK_INSUFFICIENT");
        const lineTotal = quantity.mul(product.salePrice).toDecimalPlaces(2); total = total.plus(lineTotal);
        await tx.saleItem.create({ data: { saleId: sale.id, productId, productName: product.name, quantity, unitPrice: product.salePrice, lineTotal } });
        const changed = await tx.product.updateMany({ where: { id: productId, status: "ACTIVE", stock: { gte: quantity } }, data: { stock: { decrement: quantity } } });
        if (!changed.count) throw new Error("PRODUCT_STOCK_CHANGED");
        await tx.inventoryMovement.create({ data: { productId, quantity: quantity.negated(), movementType: "SALE", reference: receiptNumber, reason: "ขายหน้าร้าน", createdBy: profile.id } });
      }
      await tx.sale.update({ where: { id: sale.id }, data: { totalAmount: total, paidAmount: total } });
      await writeAudit(tx, profile.id, "create", "sales", sale.id, { receiptNumber, total: total.toString(), itemCount: quantities.size });
      return receiptNumber;
    });
    revalidatePath("/store/pos"); revalidatePath("/store/sales"); revalidatePath("/store");
    return { ok: true, message: `บันทึกการขายแล้ว ใบเสร็จ ${receipt}` };
  } catch (error) { return errorResult("store.sale.create", error, "บันทึกการขายไม่สำเร็จ ตรวจสอบสต็อกและรายการสินค้า"); }
}

const fundTransactionTypes = ["deposit", "withdrawal", "contribution", "income", "expense", "adjustment"] as const;
export async function createFundTransactionAction(formData: FormData): Promise<ActionState> {
  const fundId = String(formData.get("fundId") ?? ""); const accountId = String(formData.get("accountId") ?? ""); const type = String(formData.get("type") ?? ""); const amount = Number(formData.get("amount")); const description = String(formData.get("description") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(fundId) || !/^[0-9a-f-]{36}$/i.test(accountId) || !fundTransactionTypes.includes(type as typeof fundTransactionTypes[number]) || !Number.isFinite(amount) || amount <= 0 || description.length < 3) return { ok: false, message: "ตรวจสอบกองทุน บัญชี ประเภทรายการ จำนวนเงิน และรายละเอียด" };
  const { profile, allowed } = await authorized("fund.transaction.create");
  if (!allowed || !profile) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์บันทึกรายการกองทุน" };
  try {
    const transactionNo = await prisma.$transaction(async (tx) => {
      const account = await tx.fundAccount.findFirst({ where: { id: accountId, fundId, isActive: true } });
      if (!account) throw new Error("FUND_ACCOUNT_UNAVAILABLE");
      const transactionNo = await allocateNumber(tx, "fund_transaction", "FT");
      const transaction = await tx.fundTransaction.create({ data: { transactionNo, fundId, accountId, type: type.toUpperCase() as "DEPOSIT" | "WITHDRAWAL" | "CONTRIBUTION" | "INCOME" | "EXPENSE" | "ADJUSTMENT", amount: new Prisma.Decimal(amount), description, status: "PENDING", createdBy: profile.id } });
      await writeAudit(tx, profile.id, "create", "fund_transactions", transaction.id, { transactionNo, amount });
      return transactionNo;
    });
    revalidatePath("/finance/funds");
    return { ok: true, message: `บันทึกรายการ ${transactionNo} แล้ว และส่งเข้าคิวอนุมัติ` };
  } catch (error) { return errorResult("finance.funds.create", error, "บันทึกรายการไม่สำเร็จ ตรวจสอบบัญชีกองทุน"); }
}

export async function approveFundTransactionAction(transactionId: string, approved: boolean, reason: string): Promise<ActionState> {
  if (!/^[0-9a-f-]{36}$/i.test(transactionId) || reason.trim().length < 3) return { ok: false, message: "ระบุรายการและเหตุผลอย่างน้อย 3 ตัวอักษร" };
  const { profile, allowed } = await authorized("fund.transaction.approve");
  if (!allowed || !profile) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์อนุมัติรายการกองทุน" };
  try {
    await serializable(async (tx) => {
      const item = await tx.fundTransaction.findUnique({ where: { id: transactionId } });
      if (!item || item.status !== "PENDING") throw new Error("TRANSACTION_NOT_PENDING");
      if (item.createdBy === profile.id) throw new Error("MAKER_CANNOT_APPROVE");
      const result = await tx.fundTransaction.updateMany({ where: { id: transactionId, status: "PENDING" }, data: { status: approved ? "APPROVED" : "REJECTED", approvedBy: profile.id, approvedAt: new Date(), reason: reason.trim() } });
      if (!result.count) throw new Error("TRANSACTION_NOT_PENDING");
      await writeAudit(tx, profile.id, approved ? "approve" : "reject", "fund_transactions", transactionId, { status: approved ? "APPROVED" : "REJECTED" }, reason.trim());
    });
    revalidatePath("/finance/funds");
    return { ok: true, message: approved ? "อนุมัติรายการแล้ว" : "ปฏิเสธรายการพร้อมบันทึกเหตุผลแล้ว" };
  } catch (error) { return errorResult("finance.funds.approve", error, "อนุมัติไม่สำเร็จ รายการอาจถูกผู้ใช้อื่นดำเนินการแล้ว"); }
}

export async function loginAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "โหมดสาธิตไม่ต้องเข้าสู่ระบบ" };
  const login = String(formData.get("login") ?? "").trim(); const password = String(formData.get("password") ?? "");
  if (!login || !password) return { ok: false, message: "กรอกชื่อผู้ใช้หรืออีเมลและรหัสผ่าน" };
  try {
    const requestHeaders = await headers(); const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const bucket = createHash("sha256").update(`${ip}:${login.toLowerCase()}`).digest("hex");
    const permitted = await serializable(async (tx) => {
      const cutoff = new Date(Date.now() - 15 * 60 * 1000);
      const limit = await tx.loginRateLimit.upsert({ where: { bucketKey: bucket }, create: { bucketKey: bucket, windowStart: new Date(), attempts: 1 }, update: { attempts: { increment: 1 } } });
      if (limit.windowStart < cutoff) { await tx.loginRateLimit.update({ where: { bucketKey: bucket }, data: { windowStart: new Date(), attempts: 1 } }); return true; }
      return limit.attempts <= 10;
    });
    if (!permitted) return { ok: false, message: "ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่" };
    let email = login;
    if (!login.includes("@")) email = (await prisma.profile.findUnique({ where: { username: login.toLowerCase() }, select: { email: true } }))?.email ?? "invalid-account@invalid.local";
    const supabase = await createServerSupabaseClient(); const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
    redirect("/dashboard");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
    return errorResult("auth.login.rate_limit", error, "ระบบตรวจสอบการเข้าสู่ระบบขัดข้องชั่วคราว");
  }
  return { ok: false, message: "เข้าสู่ระบบไม่สำเร็จ" };
}

export async function resetPasswordAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "ระบบยังไม่ได้เชื่อมต่อ Supabase" };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "กรอกอีเมลให้ถูกต้อง" };
  const appOrigin = process.env.APP_ORIGIN; if (!appOrigin) return { ok: false, message: "ระบบยังไม่ได้ตั้งค่า APP_ORIGIN กรุณาติดต่อผู้ดูแล" };
  let origin: URL; try { origin = new URL(appOrigin); } catch { return { ok: false, message: "ค่า APP_ORIGIN ไม่ถูกต้อง กรุณาติดต่อผู้ดูแล" }; }
  if (origin.protocol !== "https:" && origin.hostname !== "localhost") return { ok: false, message: "APP_ORIGIN ต้องเป็น HTTPS" };
  const supabase = await createServerSupabaseClient(); const redirectTo = new URL("/auth/callback", origin.origin); redirectTo.searchParams.set("next", "/reset-password");
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectTo.toString() });
  return error ? { ok: false, message: "ส่งลิงก์กู้บัญชีไม่สำเร็จ กรุณาติดต่อผู้ดูแล" } : { ok: true, message: "หากอีเมลนี้ลงทะเบียนไว้ ระบบจะส่งลิงก์กู้บัญชีให้" };
}

export async function updatePasswordAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "ระบบยังไม่ได้เชื่อมต่อ Supabase" };
  const password = String(formData.get("password") ?? ""); const confirmation = String(formData.get("passwordConfirmation") ?? "");
  if (password.length < 12) return { ok: false, message: "รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร" };
  if (password !== confirmation) return { ok: false, message: "รหัสผ่านทั้งสองช่องไม่ตรงกัน" };
  const supabase = await createServerSupabaseClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่" };
  const { error } = await supabase.auth.updateUser({ password }); if (error) return { ok: false, message: "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาขอลิงก์กู้บัญชีใหม่" };
  await supabase.auth.signOut(); return { ok: true, message: "เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่" };
}

export async function changePasswordAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "ระบบยังไม่ได้เชื่อมต่อ Supabase" };
  const currentPassword = String(formData.get("currentPassword") ?? ""); const password = String(formData.get("password") ?? ""); const confirmation = String(formData.get("passwordConfirmation") ?? "");
  if (!currentPassword) return { ok: false, message: "กรอกรหัสผ่านปัจจุบัน" };
  if (password.length < 12) return { ok: false, message: "รหัสผ่านใหม่ต้องมีอย่างน้อย 12 ตัวอักษร" };
  if (password !== confirmation) return { ok: false, message: "รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน" };
  if (password === currentPassword) return { ok: false, message: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน" };
  const supabase = await createServerSupabaseClient(); const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  const { error } = await supabase.auth.updateUser({ password, current_password: currentPassword });
  if (error) return { ok: false, message: error.code === "reauthentication_needed" ? "ต้องยืนยันตัวตนใหม่ก่อนเปลี่ยนรหัสผ่าน กรุณาออกจากระบบแล้วเข้าสู่ระบบอีกครั้ง" : "เปลี่ยนรหัสผ่านไม่สำเร็จ ตรวจสอบรหัสผ่านปัจจุบันหรือการตั้งค่า Auth แล้วลองใหม่" };
  const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
  return { ok: true, message: signOutError ? "เปลี่ยนรหัสผ่านแล้ว แต่ระบบออกจากอุปกรณ์อื่นไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่และติดต่อผู้ดูแล" : "เปลี่ยนรหัสผ่านแล้ว ระบบออกจากทุกอุปกรณ์ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่" };
}

export async function signOutAction() { if (isSupabaseConfigured()) { const supabase = await createServerSupabaseClient(); await supabase.auth.signOut({ scope: "local" }); } redirect("/login"); }

export async function acceptInvitationAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "ระบบยังไม่ได้เชื่อมต่อ Supabase" };
  const code = String(formData.get("code") ?? "").trim(); const username = String(formData.get("username") ?? "").trim().toLowerCase(); const email = String(formData.get("email") ?? "").trim().toLowerCase(); const password = String(formData.get("password") ?? ""); const displayName = String(formData.get("displayName") ?? "").trim();
  if (!code || !/^[a-z0-9._-]{3,32}$/.test(username) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || !displayName) return { ok: false, message: "ตรวจสอบชื่อผู้ใช้ อีเมล รหัสผ่านอย่างน้อย 12 ตัว และชื่อที่แสดง" };
  try {
    const codeHash = createHash("sha256").update(code).digest("hex");
    const valid = await prisma.staffInvitation.findFirst({ where: { codeHash, usedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } });
    if (!valid) return { ok: false, message: "รหัสเชิญไม่ถูกต้อง หมดอายุ หรือถูกใช้แล้ว" };
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { username, display_name: displayName, invitation_code: code } } });
    if (error) return { ok: false, message: error.message.includes("already registered") ? "อีเมลนี้มีบัญชีอยู่แล้ว" : "สมัครบัญชีไม่สำเร็จ กรุณาตรวจข้อมูลหรือขอรหัสเชิญใหม่" };
    return { ok: true, message: "สร้างบัญชีแล้ว กรุณาตรวจอีเมลเพื่อยืนยันก่อนเข้าสู่ระบบ" };
  } catch (error) { return errorResult("auth.invitation.accept", error, "ตรวจสอบรหัสเชิญไม่สำเร็จ"); }
}

export async function createStaffInvitationAction(formData: FormData) {
  const roleId = String(formData.get("roleId") ?? ""); const { profile, allowed } = await authorized("users.invite");
  if (!allowed || !profile) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์เชิญผู้ใช้" };
  try {
    if (!await prisma.role.findUnique({ where: { id: roleId }, select: { id: true } })) return { ok: false, message: "ไม่พบบทบาทที่เลือก" };
    const code = randomBytes(18).toString("base64url"); const codeHash = createHash("sha256").update(code).digest("hex");
    await prisma.$transaction(async (tx) => {
      const invitation = await tx.staffInvitation.create({ data: { roleId, codeHash, createdBy: profile.id, expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) } });
      await writeAudit(tx, profile.id, "create", "staff_invitations", invitation.id, { roleId, expiresAt: invitation.expiresAt.toISOString() });
    });
    revalidatePath("/settings/users");
    return { ok: true, code, href: `${process.env.APP_ORIGIN ?? ""}/invite/${encodeURIComponent(code)}` };
  } catch (error) { const requestId = await logDataError("settings.users.invite", error); return { ok: false, message: `สร้างรหัสเชิญไม่สำเร็จ (รหัสอ้างอิง ${requestId})` }; }
}

export async function saveVillageSettingsAction(formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim(); const moo = String(formData.get("moo") ?? "").trim(); const subdistrict = String(formData.get("subdistrict") ?? "").trim(); const district = String(formData.get("district") ?? "").trim(); const province = String(formData.get("province") ?? "").trim(); const postalCode = String(formData.get("postal_code") ?? "").trim(); const maxMonthlyWaterUse = Number(formData.get("maxMonthlyWaterUse"));
  if (!name || !moo || !subdistrict || !district || !province || !/^\d{5}$/.test(postalCode) || !Number.isFinite(maxMonthlyWaterUse) || maxMonthlyWaterUse < 1) return { ok: false, message: "ตรวจสอบชื่อหมู่บ้าน ที่อยู่ รอบชำระ และเกณฑ์ตรวจมิเตอร์" };
  const { profile, allowed } = await authorized("settings.manage");
  if (!allowed || !profile) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์ปรับการตั้งค่าระบบ" };
  try {
    await prisma.$transaction(async (tx) => {
      const before = await tx.villageSettings.findUnique({ where: { id: 1 } });
      const settings = await tx.villageSettings.upsert({ where: { id: 1 }, create: { id: 1, name, moo, subdistrict, district, province, postalCode, maxMonthlyWaterUse: new Prisma.Decimal(maxMonthlyWaterUse) }, update: { name, moo, subdistrict, district, province, postalCode, maxMonthlyWaterUse: new Prisma.Decimal(maxMonthlyWaterUse) } });
      await writeAudit(tx, profile.id, before ? "update" : "create", "village_settings", "1", { name: settings.name, moo: settings.moo });
    });
    revalidatePath("/settings"); revalidatePath("/dashboard");
    return { ok: true, message: "บันทึกการตั้งค่าหมู่บ้านแล้ว" };
  } catch (error) { return errorResult("settings.save", error, "บันทึกการตั้งค่าไม่สำเร็จ"); }
}
