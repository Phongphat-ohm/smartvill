import { DemoRow, householdRows, residentRows, invoiceRows, fundRows, loanRows, productRows } from "@/lib/demo-data";
import type { WorkspaceColumn, FormField, RowActionConfig } from "@/components/data-workspace";

export type WorkspaceConfig = {
  title: string;
  description: string;
  actionLabel: string;
  searchPlaceholder: string;
  columns: WorkspaceColumn[];
  fields: FormField[];
  initialRows: DemoRow[];
  filters?: string[];
  detailAction?: RowActionConfig;
};

export const workspaces: Record<string, WorkspaceConfig> = {
  households: {
    title: "ทะเบียนครัวเรือน",
    description: "จัดการบ้านเลขที่ หัวหน้าครัวเรือน สมาชิก และสถานะการอยู่อาศัย",
    actionLabel: "เพิ่มครัวเรือน",
    searchPlaceholder: "ค้นหาบ้านเลขที่ ชื่อหัวหน้าครัวเรือน...",
    detailAction: { basePath: "/households", label: "ดูและแก้ไข", accessibleLabelKey: "houseNumber" },
    columns: [
      { key: "houseNumber", label: "บ้านเลขที่" }, { key: "moo", label: "หมู่" },
      { key: "address", label: "ตำบล · อำเภอ · จังหวัด" }, { key: "type", label: "ประเภทครัวเรือน" },
      { key: "head", label: "หัวหน้าครัวเรือน" }, { key: "members", label: "สมาชิก", kind: "number" },
      { key: "waterStatus", label: "สถานะประปา", kind: "status" }, { key: "status", label: "สถานะครัวเรือน", kind: "status" },
    ],
    fields: [
      { key: "houseNumber", label: "บ้านเลขที่", required: true }, { key: "moo", label: "หมู่ที่", required: true }, { key: "road", label: "ถนน" },
      { key: "subdistrict", label: "ตำบล/แขวง", required: true }, { key: "district", label: "อำเภอ/เขต", required: true },
      { key: "province", label: "จังหวัด", required: true }, { key: "postalCode", label: "รหัสไปรษณีย์", required: true },
      { key: "type", label: "ประเภทครัวเรือน", kind: "select", required: true, options: [
        { value: "residential", label: "ที่อยู่อาศัย" },
        { value: "commercial", label: "พาณิชยกรรม" },
        { value: "mixed", label: "ที่อยู่อาศัยและพาณิชยกรรม" },
      ] },
    ],
    initialRows: householdRows,
    filters: ["ทั้งหมด", "มีผู้อยู่อาศัย", "ว่าง", "เก็บประวัติ"],
  },
  people: {
    title: "ทะเบียนประชากร",
    description: "ค้นหาและดูแลข้อมูลสมาชิกพร้อมความสัมพันธ์กับครัวเรือน",
    actionLabel: "เพิ่มประชากร",
    searchPlaceholder: "ค้นหาชื่อ นามสกุล หรือบ้านเลขที่...",
    detailAction: { basePath: "/people", label: "ดูและแก้ไข", accessibleLabelKey: "name" },
    columns: [
      { key: "name", label: "ชื่อ–นามสกุล" }, { key: "household", label: "บ้านเลขที่" },
      { key: "relationship", label: "ความสัมพันธ์" }, { key: "birthDate", label: "วันเกิด" },
      { key: "phone", label: "โทรศัพท์" }, { key: "status", label: "สถานะ", kind: "status" },
    ],
    fields: [
      { key: "firstName", label: "ชื่อ", required: true }, { key: "lastName", label: "นามสกุล", required: true },
      { key: "nationalId", label: "เลขบัตรประชาชน (ไม่บังคับ)" }, { key: "birthDate", label: "วันเกิด", kind: "date" },
      { key: "phone", label: "เบอร์โทรศัพท์" }, { key: "householdId", label: "ครัวเรือน", kind: "autocomplete", required: true, placeholder: "ค้นหาบ้านเลขที่หรือหมู่..." },
      { key: "relationship", label: "ความสัมพันธ์", kind: "select", required: true, options: ["หัวหน้าครัวเรือน", "คู่สมรส", "บุตร", "ญาติ", "ผู้อาศัย"] },
    ],
    initialRows: residentRows,
    filters: ["ทั้งหมด", "อาศัยอยู่", "ย้ายเข้า", "ย้ายออก", "เสียชีวิต"],
  },
  billing: {
    title: "ใบแจ้งหนี้ค่าน้ำ",
    description: "ตรวจสอบยอดเรียกเก็บ รับชำระบางส่วน และติดตามยอดค้าง",
    actionLabel: "ออกใบแจ้งหนี้",
    searchPlaceholder: "ค้นหาเลขที่บิล ชื่อ หรือบ้านเลขที่...",
    columns: [
      { key: "id", label: "เลขที่บิล" }, { key: "houseNumber", label: "บ้านเลขที่" }, { key: "name", label: "ผู้ใช้น้ำ" },
      { key: "period", label: "รอบบิล" }, { key: "amount", label: "ยอดบิล", kind: "money" }, { key: "paid", label: "ชำระแล้ว", kind: "money" }, { key: "status", label: "สถานะ", kind: "status" },
    ],
    fields: [
      { key: "houseNumber", label: "บ้านเลขที่", required: true }, { key: "name", label: "ผู้ใช้น้ำ", required: true },
      { key: "period", label: "รอบบิล", required: true }, { key: "amount", label: "ยอดเรียกเก็บ", kind: "number", required: true },
      { key: "status", label: "สถานะ", kind: "select", options: ["รอชำระ", "ชำระบางส่วน", "ชำระแล้ว"] },
    ],
    initialRows: invoiceRows,
    filters: ["ทั้งหมด", "ชำระแล้ว", "ชำระบางส่วน", "เกินกำหนด", "รอตรวจมิเตอร์", "รออ่านมิเตอร์"],
  },
  funds: {
    title: "บัญชีกองทุน",
    description: "ติดตามเงินเข้า–ออก สมาชิก และรายการที่รออนุมัติ",
    actionLabel: "บันทึกรายการ",
    searchPlaceholder: "ค้นหาเลขรายการ ชื่อ หรือรายละเอียด...",
    columns: [
      { key: "id", label: "เลขที่รายการ" }, { key: "date", label: "วันที่" }, { key: "description", label: "รายละเอียด" },
      { key: "member", label: "สมาชิก/บัญชี" }, { key: "amount", label: "ยอดเงิน", kind: "money" }, { key: "type", label: "ประเภท" }, { key: "status", label: "สถานะ", kind: "status" },
    ],
    fields: [
      { key: "description", label: "รายละเอียด", required: true }, { key: "member", label: "สมาชิก/บัญชี", required: true },
      { key: "amount", label: "ยอดเงิน", kind: "number", required: true }, { key: "type", label: "ประเภทรายการ", kind: "select", options: ["เงินเข้า", "เงินออก", "เงินฝาก", "เงินถอน", "เงินสมทบ"] },
      { key: "status", label: "สถานะ", kind: "select", options: ["รออนุมัติ", "อนุมัติแล้ว"] },
    ],
    initialRows: fundRows,
    filters: ["ทั้งหมด", "รออนุมัติ", "อนุมัติแล้ว"],
  },
  loans: {
    title: "สินเชื่อกองทุน",
    description: "จัดการคำขอ สัญญา ตารางผ่อน ผู้ค้ำ และยอดค้างชำระ",
    actionLabel: "สร้างคำขอสินเชื่อ",
    searchPlaceholder: "ค้นหาเลขสัญญา ชื่อสมาชิก...",
    columns: [
      { key: "id", label: "เลขที่สัญญา" }, { key: "borrower", label: "ผู้กู้" }, { key: "product", label: "ผลิตภัณฑ์" },
      { key: "principal", label: "วงเงิน", kind: "money" }, { key: "remaining", label: "เงินต้นคงเหลือ", kind: "money" },
      { key: "nextDue", label: "งวดถัดไป" }, { key: "status", label: "สถานะ", kind: "status" },
    ],
    fields: [
      { key: "borrower", label: "ผู้กู้", required: true }, { key: "product", label: "ผลิตภัณฑ์", kind: "select", options: ["สินเชื่อฉุกเฉิน", "สินเชื่อพัฒนาคุณภาพชีวิต"] },
      { key: "principal", label: "จำนวนเงินกู้", kind: "number", required: true }, { key: "guarantors", label: "จำนวนผู้ค้ำ", kind: "number", required: true },
      { key: "status", label: "สถานะ", kind: "select", options: ["รออนุมัติ", "กำลังชำระ"] },
    ],
    initialRows: loanRows,
    filters: ["ทั้งหมด", "รออนุมัติ", "กำลังชำระ", "ปิดบัญชี"],
  },
  store: {
    title: "สินค้าและสต็อก",
    description: "ดูแลสินค้า ราคา barcode และรายการเคลื่อนไหวของสต็อก",
    actionLabel: "เพิ่มสินค้า",
    searchPlaceholder: "ค้นหาชื่อสินค้า รหัส หรือ barcode...",
    columns: [
      { key: "id", label: "รหัสสินค้า" }, { key: "barcode", label: "Barcode" }, { key: "name", label: "ชื่อสินค้า" },
      { key: "category", label: "หมวดหมู่" }, { key: "price", label: "ราคา", kind: "money" }, { key: "stock", label: "คงเหลือ", kind: "number" }, { key: "status", label: "สถานะ", kind: "status" },
    ],
    fields: [
      { key: "barcode", label: "Barcode", required: true }, { key: "name", label: "ชื่อสินค้า", required: true },
      { key: "category", label: "หมวดหมู่", required: true }, { key: "price", label: "ราคาขาย", kind: "number", required: true },
      { key: "stock", label: "จำนวนเริ่มต้น", kind: "number", required: true }, { key: "status", label: "สถานะ", kind: "select", options: ["พร้อมขาย", "ใกล้หมด", "หมด"] },
    ],
    initialRows: productRows,
    filters: ["ทั้งหมด", "พร้อมขาย", "ใกล้หมด", "หมด"],
  },
};
