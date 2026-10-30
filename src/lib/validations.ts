import { z } from "zod";

const requiredText = (label: string) => z.string().trim().min(1, `${label}จำเป็นต้องระบุ`);

export const householdSchema = z.object({
  houseNumber: requiredText("บ้านเลขที่"),
  moo: z.string().trim().default(""),
  road: z.string().trim().default(""),
  subdistrict: requiredText("ตำบล/แขวง"),
  district: requiredText("อำเภอ/เขต"),
  province: requiredText("จังหวัด"),
  postalCode: z.string().trim().regex(/^\d{5}$/, "รหัสไปรษณีย์ต้องมี 5 หลัก"),
  type: z.enum(["residential", "commercial", "mixed"]),
});

export const residentSchema = z.object({
  firstName: requiredText("ชื่อ"),
  lastName: requiredText("นามสกุล"),
  nationalId: z.string().regex(/^\d{13}$/, "เลขบัตรประชาชนต้องมี 13 หลัก").optional().or(z.literal("")),
  birthDate: z.string().date("วันเกิดไม่ถูกต้อง").optional().or(z.literal("")),
  phone: z.string().trim().max(30, "เบอร์โทรศัพท์ยาวเกินไป").default(""),
  householdId: requiredText("ครัวเรือน"),
  relationship: requiredText("ความสัมพันธ์กับหัวหน้าครัวเรือน"),
});

export const householdUpdateSchema = householdSchema.extend({
  id: z.string().uuid("ไม่พบรหัสครัวเรือน"),
  occupancyStatus: z.enum(["occupied", "vacant", "archived"]),
  note: z.string().trim().max(2000, "หมายเหตุต้องไม่เกิน 2,000 ตัวอักษร").default(""),
});

export const residentUpdateSchema = z.object({
  id: z.string().uuid("ไม่พบรหัสประชากร"),
  firstName: requiredText("ชื่อ"),
  lastName: requiredText("นามสกุล"),
  nationalId: z.string().regex(/^\d{13}$/, "เลขบัตรประชาชนต้องมี 13 หลัก").optional().or(z.literal("")),
  birthDate: z.string().date("วันเกิดไม่ถูกต้อง").optional().or(z.literal("")),
  phone: z.string().trim().max(30, "เบอร์โทรศัพท์ยาวเกินไป").default(""),
});

export const residencyChangeSchema = z.object({
  residentId: z.string().uuid("ไม่พบรหัสประชากร"),
  destinationHouseholdId: z.string().uuid("เลือกครัวเรือนปลายทางให้ถูกต้อง").optional().or(z.literal("")),
  relationship: requiredText("ความสัมพันธ์"),
  changeDate: z.string().date("วันที่ย้ายไม่ถูกต้อง"),
  reason: z.string().trim().min(3, "ระบุเหตุผลอย่างน้อย 3 ตัวอักษร").max(255),
});

export const deceasedResidentSchema = z.object({
  residentId: z.string().uuid("ไม่พบรหัสประชากร"),
  deceasedAt: z.string().date("วันที่เสียชีวิตไม่ถูกต้อง"),
  reason: z.string().trim().min(3, "ระบุแหล่งข้อมูลหรือเหตุผลอย่างน้อย 3 ตัวอักษร").max(255),
});

export const meterReadingSchema = z.object({
  meterId: requiredText("มิเตอร์"),
  readingDate: z.string().date("วันที่อ่านมิเตอร์ไม่ถูกต้อง"),
  readingValue: z.coerce.number().min(0, "เลขมิเตอร์ต้องไม่ติดลบ"),
  note: z.string().trim().default(""),
});

export const paymentSchema = z.object({
  invoiceId: requiredText("ใบแจ้งหนี้"),
  amount: z.coerce.number().positive("ยอดชำระต้องมากกว่า 0"),
  method: z.enum(["cash", "transfer", "other"]),
  reference: z.string().trim().default(""),
});
