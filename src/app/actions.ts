"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { householdSchema, householdUpdateSchema, meterReadingSchema, paymentSchema, residentSchema, residentUpdateSchema, residencyChangeSchema } from "@/lib/validations";
import { createAdminSupabaseClient, createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { decryptNationalId, encryptNationalId, nationalIdLookupHash } from "@/lib/security/national-id";

export type ActionState = { ok: boolean; message: string; code?: string };

async function currentUserWithPermission(permission: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null, allowed: false };
  const { data: allowed } = await supabase.rpc("has_permission", { permission_key: permission });
  return { supabase, user, allowed: Boolean(allowed) };
}

export async function createHouseholdAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "ระบบยังไม่ได้เชื่อมต่อ Supabase" };
  const parsed = householdSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  const { supabase, allowed } = await currentUserWithPermission("registry.household.create");
  if (!allowed) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์เพิ่มครัวเรือน" };
  const { error } = await supabase.from("households").insert({
    house_number: parsed.data.houseNumber,
    moo: parsed.data.moo,
    road: parsed.data.road,
    subdistrict: parsed.data.subdistrict,
    district: parsed.data.district,
    province: parsed.data.province,
    postal_code: parsed.data.postalCode,
    household_type: parsed.data.type,
    occupancy_status: "occupied",
  });
  return error ? { ok: false, message: "บันทึกครัวเรือนไม่สำเร็จ กรุณาตรวจข้อมูลและสิทธิ์" } : { ok: true, message: "เพิ่มครัวเรือนแล้ว" };
}

export async function createHouseholdFormAction(formData: FormData) {
  return createHouseholdAction({ ok: false, message: "" }, formData);
}

export async function updateHouseholdAction(formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "ระบบยังไม่ได้เชื่อมต่อ Supabase" };
  const parsed = householdUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  const { supabase, allowed } = await currentUserWithPermission("registry.household.update");
  if (!allowed) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์แก้ไขครัวเรือน" };
  const value = parsed.data;
  const { error } = await supabase.rpc("update_household_record", { household_id: value.id, house_number: value.houseNumber, village_moo: value.moo, road_value: value.road || null, subdistrict_value: value.subdistrict, district_value: value.district, province_value: value.province, postal_code_value: value.postalCode, household_type_value: value.type, occupancy_status_value: value.occupancyStatus, note_value: value.note || null });
  if (error) return { ok: false, message: "แก้ไขครัวเรือนไม่สำเร็จ ตรวจสอบข้อมูลและสถานะ" };
  revalidatePath("/households"); revalidatePath(`/households/${value.id}`);
  return { ok: true, message: "บันทึกข้อมูลครัวเรือนแล้ว" };
}

export async function archiveHouseholdAction(formData: FormData): Promise<ActionState> {
  const householdId = String(formData.get("householdId") ?? ""); const reason = String(formData.get("reason") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(householdId) || reason.length < 3) return { ok: false, message: "ระบุเหตุผลอย่างน้อย 3 ตัวอักษร" };
  const { supabase, allowed } = await currentUserWithPermission("registry.household.update");
  if (!allowed) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์เก็บประวัติครัวเรือน" };
  const { error } = await supabase.rpc("archive_household_record", { household_id: householdId, archive_reason: reason });
  if (error) return { ok: false, message: "เก็บประวัติไม่ได้: ต้องย้ายสมาชิกปัจจุบันออกและปิดจุดใช้น้ำ active ก่อน" };
  revalidatePath("/households"); revalidatePath(`/households/${householdId}`);
  return { ok: true, message: "เก็บประวัติครัวเรือนแล้ว" };
}

export async function createResidentAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "ระบบยังไม่ได้เชื่อมต่อ Supabase" };
  const parsed = residentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  const { supabase, allowed } = await currentUserWithPermission("registry.resident.create");
  if (!allowed) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์เพิ่มข้อมูลประชากร" };
  const nationalId = parsed.data.nationalId?.trim();
  let encryptedId: string | null = null;
  let lookupHash: string | null = null;
  try {
    if (nationalId) { encryptedId = encryptNationalId(nationalId); lookupHash = nationalIdLookupHash(nationalId); }
  } catch { return { ok: false, message: "ระบบเข้ารหัสเลขบัตรยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแล" }; }
  const { error } = await supabase.rpc("create_resident_with_membership", {
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    national_id_ciphertext: encryptedId,
    national_id_lookup_hash: lookupHash,
    birth_date: parsed.data.birthDate || null,
    phone: parsed.data.phone || null,
    household_id: parsed.data.householdId,
    relationship: parsed.data.relationship,
  });
  return error ? { ok: false, message: "บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสิทธิ์และข้อมูลครัวเรือน" } : { ok: true, message: "เพิ่มข้อมูลประชากรแล้ว" };
}

export async function createResidentFormAction(formData: FormData) {
  return createResidentAction({ ok: false, message: "" }, formData);
}

export async function updateResidentAction(formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "ระบบยังไม่ได้เชื่อมต่อ Supabase" };
  const parsed = residentUpdateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  const { supabase, allowed } = await currentUserWithPermission("registry.resident.update");
  if (!allowed) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์แก้ไขข้อมูลประชากร" };
  const nationalId = parsed.data.nationalId?.trim() ?? ""; let ciphertext: string | null = null; let hash: string | null = null;
  try { if (nationalId) { ciphertext = encryptNationalId(nationalId); hash = nationalIdLookupHash(nationalId); } } catch { return { ok: false, message: "ระบบเข้ารหัสเลขบัตรยังไม่ได้ตั้งค่า" }; }
  const { error } = await supabase.rpc("update_resident_record", { resident_id: parsed.data.id, first_name_value: parsed.data.firstName, last_name_value: parsed.data.lastName, birth_date_value: parsed.data.birthDate || null, phone_value: parsed.data.phone || null, replace_national_id: Boolean(nationalId), national_id_ciphertext_value: ciphertext, national_id_lookup_hash_value: hash });
  if (error) return { ok: false, message: "แก้ไขข้อมูลประชากรไม่สำเร็จ ตรวจสอบเลขบัตรไม่ซ้ำและสิทธิ์" };
  revalidatePath("/people"); revalidatePath(`/people/${parsed.data.id}`);
  return { ok: true, message: "บันทึกข้อมูลประชากรแล้ว" };
}

export async function changeResidencyAction(formData: FormData): Promise<ActionState> {
  const parsed = residencyChangeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "ข้อมูลการย้ายไม่ถูกต้อง" };
  const { supabase, allowed } = await currentUserWithPermission("registry.resident.update");
  if (!allowed) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์ย้ายทะเบียนประชากร" };
  const value = parsed.data;
  const { error } = await supabase.rpc("change_residency", { resident_id: value.residentId, destination_household_id: value.destinationHouseholdId || null, relationship: value.relationship, change_date: value.changeDate, change_reason: value.reason });
  if (error) return { ok: false, message: "ย้ายทะเบียนไม่สำเร็จ ตรวจสอบวันย้ายและครัวเรือนปลายทาง" };
  revalidatePath("/people"); revalidatePath(`/people/${value.residentId}`); revalidatePath("/households");
  return { ok: true, message: value.destinationHouseholdId ? "ย้ายเข้าครัวเรือนใหม่แล้ว" : "บันทึกการย้ายออกแล้ว" };
}

export async function setHouseholdHeadAction(formData: FormData): Promise<ActionState> {
  const householdId = String(formData.get("householdId") ?? ""); const residentId = String(formData.get("residentId") ?? ""); const reason = String(formData.get("reason") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(householdId) || !/^[0-9a-f-]{36}$/i.test(residentId) || reason.length < 3) return { ok: false, message: "ระบุผู้รับตำแหน่งและเหตุผลอย่างน้อย 3 ตัวอักษร" };
  const { supabase, allowed } = await currentUserWithPermission("registry.resident.update");
  if (!allowed) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์เปลี่ยนหัวหน้าครัวเรือน" };
  const { error } = await supabase.rpc("set_household_head", { household_id: householdId, resident_id: residentId, change_reason: reason });
  if (error) return { ok: false, message: "เปลี่ยนหัวหน้าครัวเรือนไม่สำเร็จ" };
  revalidatePath("/households"); revalidatePath(`/households/${householdId}`); revalidatePath("/people"); revalidatePath(`/people/${residentId}`);
  return { ok: true, message: "เปลี่ยนหัวหน้าครัวเรือนแล้ว" };
}

export async function revealNationalIdAction(residentId: string): Promise<{ ok: boolean; message?: string; nationalId?: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(residentId)) return { ok: false, message: "ไม่พบรหัสประชากร" };
  const { supabase, allowed } = await currentUserWithPermission("registry.resident.sensitive.read");
  if (!allowed) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์ดูเลขบัตรเต็ม" };
  const { data, error } = await supabase.rpc("get_resident_national_id_ciphertext", { resident_id: residentId });
  if (error || !data) return { ok: false, message: "ไม่พบเลขบัตรหรือไม่สามารถเปิดดูได้" };
  try { return { ok: true, nationalId: decryptNationalId(String(data)) }; } catch { return { ok: false, message: "ไม่สามารถถอดรหัสเลขบัตรได้" }; }
}

export async function findResidentByNationalIdAction(nationalId: string): Promise<{ ok: boolean; message?: string; resident?: { id: string; name: string; household: string } }> {
  if (!/^\d{13}$/.test(nationalId)) return { ok: false, message: "กรอกเลขบัตรประชาชน 13 หลัก" };
  const { supabase, allowed } = await currentUserWithPermission("registry.resident.sensitive.read");
  if (!allowed) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์ค้นหาด้วยเลขบัตร" };
  let lookupHash: string;
  try { lookupHash = nationalIdLookupHash(nationalId); } catch { return { ok: false, message: "ระบบเข้ารหัสเลขบัตรยังไม่ได้ตั้งค่า" }; }
  const { data, error } = await supabase.rpc("find_resident_by_national_id", { lookup_hash: lookupHash });
  const row = Array.isArray(data) ? data[0] as { id: string; first_name: string; last_name: string; house_number: string | null; moo: string | null } | undefined : undefined;
  if (error) return { ok: false, message: "ค้นหาข้อมูลไม่สำเร็จ" };
  if (!row) return { ok: false, message: "ไม่พบประชากรจากเลขบัตรนี้" };
  return { ok: true, resident: { id: row.id, name: `${row.first_name} ${row.last_name}`, household: row.house_number ? `บ้านเลขที่ ${row.house_number} หมู่ ${row.moo ?? "—"}` : "ไม่มีครัวเรือนปัจจุบัน" } };
}

export async function recordWaterReadingAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "ระบบยังไม่ได้เชื่อมต่อ Supabase" };
  const parsed = meterReadingSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "เลขมิเตอร์ไม่ถูกต้อง" };
  const { supabase, allowed } = await currentUserWithPermission("water.reading.create");
  if (!allowed) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์บันทึกเลขมิเตอร์" };
  const { error } = await supabase.rpc("record_water_reading", {
    meter_id: parsed.data.meterId,
    reading_date: parsed.data.readingDate,
    reading_value: parsed.data.readingValue,
    note: parsed.data.note || null,
  });
  return error ? { ok: false, message: "บันทึกเลขมิเตอร์ไม่สำเร็จ" } : { ok: true, message: "บันทึกเลขมิเตอร์แล้ว" };
}

export async function recordWaterReadingFormAction(formData: FormData) {
  return recordWaterReadingAction({ ok: false, message: "" }, formData);
}

export async function reviewWaterReadingAction(formData: FormData): Promise<ActionState> {
  const readingId = String(formData.get("readingId") ?? "");
  const approved = formData.get("approved") === "true";
  const reason = String(formData.get("reason") ?? "").trim();
  if (!readingId || reason.length < 3) return { ok: false, message: "ระบุรายการและเหตุผลตรวจสอบอย่างน้อย 3 ตัวอักษร" };
  const { supabase, allowed } = await currentUserWithPermission("water.reading.review");
  if (!allowed) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์ตรวจสอบเลขมิเตอร์" };
  const { error } = await supabase.rpc("review_water_reading", { reading_id: readingId, approved, reason });
  return error ? { ok: false, message: "ตรวจสอบรายการไม่สำเร็จ กรุณาตรวจสิทธิ์และสถานะรายการ" } : { ok: true, message: approved ? "ยืนยันเลขมิเตอร์แล้ว" : "ปฏิเสธรายการและเก็บประวัติแล้ว" };
}

export async function recordWaterPaymentAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "ระบบยังไม่ได้เชื่อมต่อ Supabase" };
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "ยอดชำระไม่ถูกต้อง" };
  const { supabase, allowed } = await currentUserWithPermission("water.payment.create");
  if (!allowed) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์บันทึกการรับชำระ" };
  const { error } = await supabase.rpc("record_water_payment", {
    invoice_id: parsed.data.invoiceId,
    amount: parsed.data.amount,
    payment_method: parsed.data.method,
    reference: parsed.data.reference || null,
  });
  return error ? { ok: false, message: "บันทึกการรับชำระไม่สำเร็จ" } : { ok: true, message: "บันทึกการรับชำระและใบเสร็จแล้ว" };
}

export async function recordWaterPaymentFormAction(formData: FormData) {
  return recordWaterPaymentAction({ ok: false, message: "" }, formData);
}

export async function generateWaterInvoiceAction(readingId: string): Promise<ActionState> {
  const { supabase, allowed } = await currentUserWithPermission("water.invoice.create");
  if (!allowed) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์ออกใบแจ้งหนี้" };
  const { error } = await supabase.rpc("generate_water_invoice", { reading_id: readingId });
  return error ? { ok: false, message: "ออกใบแจ้งหนี้ไม่สำเร็จ ตรวจสอบสถานะการอ่านและอัตราค่าน้ำที่มีผล" } : { ok: true, message: "ออกใบแจ้งหนี้แล้ว" };
}

export async function recordShopSaleAction(items: Array<{ productId: string; quantity: number }>, method: string): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "ระบบยังไม่ได้เชื่อมต่อ Supabase" };
  if (!Array.isArray(items) || items.length < 1 || items.length > 100 || items.some((item) => !/^[0-9a-f-]{36}$/i.test(item.productId) || !Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 10000) || !["cash", "transfer", "other"].includes(method)) {
    return { ok: false, message: "ตรวจสอบรายการสินค้า จำนวน และช่องทางรับเงิน" };
  }
  const { supabase, allowed } = await currentUserWithPermission("store.sale.create");
  if (!allowed) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์บันทึกการขาย" };
  const { data, error } = await supabase.rpc("record_shop_sale", { items: items.map((item) => ({ product_id: item.productId, quantity: item.quantity })), payment_method: method });
  return error ? { ok: false, message: "บันทึกการขายไม่สำเร็จ ตรวจสอบสต็อกและสิทธิ์" } : { ok: true, message: `บันทึกการขายแล้ว ใบเสร็จ ${data}` };
}

const fundTransactionTypes = ["deposit", "withdrawal", "contribution", "income", "expense", "adjustment"] as const;

export async function createFundTransactionAction(formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "ระบบยังไม่ได้เชื่อมต่อ Supabase" };
  const fundId = String(formData.get("fundId") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const type = String(formData.get("type") ?? "");
  const amount = Number(formData.get("amount"));
  const description = String(formData.get("description") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(fundId) || !/^[0-9a-f-]{36}$/i.test(accountId) || !fundTransactionTypes.includes(type as typeof fundTransactionTypes[number]) || !Number.isFinite(amount) || amount <= 0 || description.length < 3) return { ok: false, message: "ตรวจสอบกองทุน บัญชี ประเภทรายการ จำนวนเงิน และรายละเอียด" };
  const { supabase, allowed } = await currentUserWithPermission("fund.transaction.create");
  if (!allowed) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์บันทึกรายการกองทุน" };
  const { data, error } = await supabase.rpc("record_fund_transaction", { fund_id: fundId, account_id: accountId, transaction_type: type, amount, description, member_id: null });
  return error ? { ok: false, message: "บันทึกรายการไม่สำเร็จ ตรวจสอบบัญชีกองทุนและสิทธิ์" } : { ok: true, message: `บันทึกรายการ ${data} แล้ว และส่งเข้าคิวอนุมัติ` };
}

export async function approveFundTransactionAction(transactionId: string, approved: boolean, reason: string): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "ระบบยังไม่ได้เชื่อมต่อ Supabase" };
  if (!/^[0-9a-f-]{36}$/i.test(transactionId) || reason.trim().length < 3) return { ok: false, message: "ระบุรายการและเหตุผลอย่างน้อย 3 ตัวอักษร" };
  const { supabase, allowed } = await currentUserWithPermission("fund.transaction.approve");
  if (!allowed) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์อนุมัติรายการกองทุน" };
  const { error } = await supabase.rpc("approve_fund_transaction", { transaction_id: transactionId, approve: approved, reason: reason.trim() });
  return error ? { ok: false, message: "อนุมัติไม่สำเร็จ รายการอาจถูกผู้ใช้อื่นดำเนินการแล้ว" } : { ok: true, message: approved ? "อนุมัติรายการแล้ว" : "ปฏิเสธรายการพร้อมบันทึกเหตุผลแล้ว" };
}

export async function loginAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "โหมดสาธิตไม่ต้องเข้าสู่ระบบ" };
  const login = String(formData.get("login") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!login || !password) return { ok: false, message: "กรอกชื่อผู้ใช้หรืออีเมลและรหัสผ่าน" };
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const bucket = createHash("sha256").update(`${ip}:${login.toLowerCase()}`).digest("hex");
  const admin = createAdminSupabaseClient();
  const { data: allowed, error: rateLimitError } = await admin.rpc("consume_login_rate_limit", { bucket_key: bucket });
  if (rateLimitError) return { ok: false, message: "ระบบตรวจสอบการเข้าสู่ระบบขัดข้องชั่วคราว กรุณาลองใหม่ภายหลัง" };
  if (allowed !== true) return { ok: false, message: "ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่" };

  let email = login;
  if (!login.includes("@")) {
    const { data: profile } = await admin.from("profiles").select("email").eq("username", login).maybeSingle();
    email = profile?.email ?? "invalid-account@invalid.local";
  }
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
  redirect("/dashboard");
}

export async function resetPasswordAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "ระบบยังไม่ได้เชื่อมต่อ Supabase" };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "กรอกอีเมลให้ถูกต้อง" };
  const appOrigin = process.env.APP_ORIGIN;
  if (!appOrigin) return { ok: false, message: "ระบบยังไม่ได้ตั้งค่า APP_ORIGIN กรุณาติดต่อผู้ดูแล" };
  let origin: URL;
  try { origin = new URL(appOrigin); } catch { return { ok: false, message: "ค่า APP_ORIGIN ไม่ถูกต้อง กรุณาติดต่อผู้ดูแล" }; }
  if (origin.protocol !== "https:" && origin.hostname !== "localhost") return { ok: false, message: "APP_ORIGIN ต้องเป็น HTTPS" };
  const supabase = await createServerSupabaseClient();
  const redirectTo = new URL("/auth/callback", origin.origin);
  redirectTo.searchParams.set("next", "/reset-password");
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectTo.toString() });
  return error ? { ok: false, message: "ส่งลิงก์กู้บัญชีไม่สำเร็จ กรุณาติดต่อผู้ดูแล" } : { ok: true, message: "หากอีเมลนี้ลงทะเบียนไว้ ระบบจะส่งลิงก์กู้บัญชีให้" };
}

export async function updatePasswordAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "ระบบยังไม่ได้เชื่อมต่อ Supabase" };
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");
  if (password.length < 12) return { ok: false, message: "รหัสผ่านต้องมีอย่างน้อย 12 ตัวอักษร" };
  if (password !== passwordConfirmation) return { ok: false, message: "รหัสผ่านทั้งสองช่องไม่ตรงกัน" };
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "ลิงก์หมดอายุหรือไม่ถูกต้อง กรุณาขอลิงก์ใหม่" };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, message: "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาขอลิงก์กู้บัญชีใหม่" };
  await supabase.auth.signOut();
  return { ok: true, message: "เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่" };
}

export async function changePasswordAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "ระบบยังไม่ได้เชื่อมต่อ Supabase" };
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const password = String(formData.get("password") ?? "");
  const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");
  if (!currentPassword) return { ok: false, message: "กรอกรหัสผ่านปัจจุบัน" };
  if (password.length < 12) return { ok: false, message: "รหัสผ่านใหม่ต้องมีอย่างน้อย 12 ตัวอักษร" };
  if (password !== passwordConfirmation) return { ok: false, message: "รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน" };
  if (password === currentPassword) return { ok: false, message: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน" };

  const supabase = await createServerSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { ok: false, message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  const { error } = await supabase.auth.updateUser({ password, current_password: currentPassword });
  if (error) {
    const message = error.code === "reauthentication_needed"
      ? "ต้องยืนยันตัวตนใหม่ก่อนเปลี่ยนรหัสผ่าน กรุณาออกจากระบบแล้วเข้าสู่ระบบอีกครั้ง"
      : "เปลี่ยนรหัสผ่านไม่สำเร็จ ตรวจสอบรหัสผ่านปัจจุบันหรือการตั้งค่า Auth แล้วลองใหม่";
    return { ok: false, message };
  }
  const { error: signOutError } = await supabase.auth.signOut({ scope: "global" });
  return {
    ok: true,
    message: signOutError
      ? "เปลี่ยนรหัสผ่านแล้ว แต่ระบบออกจากอุปกรณ์อื่นไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่และติดต่อผู้ดูแล"
      : "เปลี่ยนรหัสผ่านแล้ว ระบบออกจากทุกอุปกรณ์ กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่",
  };
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

export async function acceptInvitationAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "ระบบยังไม่ได้เชื่อมต่อ Supabase" };
  const code = String(formData.get("code") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!code || !/^[a-z0-9._-]{3,32}$/.test(username) || !email || password.length < 12 || !displayName) {
    return { ok: false, message: "ตรวจสอบชื่อผู้ใช้ อีเมล รหัสผ่านอย่างน้อย 12 ตัว และชื่อที่แสดง" };
  }
  const supabase = await createServerSupabaseClient();
  const { data: valid } = await supabase.rpc("validate_staff_invitation", { invitation_code: code });
  if (!valid) return { ok: false, message: "รหัสเชิญไม่ถูกต้อง หมดอายุ หรือถูกใช้แล้ว" };
  const { error } = await supabase.auth.signUp({ email, password, options: { data: { username, display_name: displayName, invitation_code: code } } });
  if (error) return { ok: false, message: error.message.includes("already registered") ? "อีเมลนี้มีบัญชีอยู่แล้ว" : "สมัครบัญชีไม่สำเร็จ กรุณาตรวจข้อมูลหรือขอรหัสเชิญใหม่" };
  return { ok: true, message: "สร้างบัญชีแล้ว กรุณาตรวจอีเมลเพื่อยืนยันก่อนเข้าสู่ระบบ" };
}

export async function createStaffInvitationAction(formData: FormData) {
  const roleId = String(formData.get("roleId") ?? "");
  const { supabase, allowed } = await currentUserWithPermission("users.invite");
  if (!allowed) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์เชิญผู้ใช้" };
  const { data: { user } } = await supabase.auth.getUser();
  const code = randomBytes(18).toString("base64url");
  const codeHash = createHash("sha256").update(code).digest("hex");
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("staff_invitations").insert({ role_id: roleId, code_hash: codeHash, created_by: user!.id, expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() });
  if (error) return { ok: false, message: "สร้างรหัสเชิญไม่สำเร็จ" };
  return { ok: true, code, href: `${process.env.APP_ORIGIN ?? ""}/invite/${encodeURIComponent(code)}` };
}

export async function saveVillageSettingsAction(formData: FormData): Promise<ActionState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "โหมดสาธิต: ไม่ได้บันทึกลงฐานข้อมูล" };
  const name = String(formData.get("name") ?? "").trim();
  const moo = String(formData.get("moo") ?? "").trim();
  const subdistrict = String(formData.get("subdistrict") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const province = String(formData.get("province") ?? "").trim();
  const postalCode = String(formData.get("postal_code") ?? "").trim();
  const maxMonthlyWaterUse = Number(formData.get("maxMonthlyWaterUse"));
  if (!name || !moo || !subdistrict || !district || !province || !/^\d{5}$/.test(postalCode) || !Number.isFinite(maxMonthlyWaterUse) || maxMonthlyWaterUse < 1) {
    return { ok: false, message: "ตรวจสอบชื่อหมู่บ้าน ที่อยู่ รอบชำระ และเกณฑ์ตรวจมิเตอร์" };
  }
  const { supabase, allowed } = await currentUserWithPermission("settings.manage");
  if (!allowed) return { ok: false, message: "บัญชีนี้ไม่มีสิทธิ์ปรับการตั้งค่าระบบ" };
  const { error } = await supabase.from("village_settings").update({ name, moo, subdistrict, district, province, postal_code: postalCode, max_monthly_water_use: maxMonthlyWaterUse }).eq("id", 1);
  if (error) return { ok: false, message: "บันทึกการตั้งค่าไม่สำเร็จ กรุณาตรวจสอบสิทธิ์และฐานข้อมูล" };
  return { ok: true, message: "บันทึกการตั้งค่าหมู่บ้านแล้ว" };
}
