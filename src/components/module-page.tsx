import { createHouseholdFormAction, createResidentFormAction } from "@/app/actions";
import { DataWorkspace } from "@/components/data-workspace";
import type { DemoRow } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { workspaces } from "@/lib/workspaces";
import { currentUserWithPermission, logDataError } from "@/lib/data-access";
import { prisma } from "@/lib/prisma";
import { currentHouseholdHeadLabel } from "@/lib/domain/registry";
import { formatThaiDate } from "@/lib/format";
import { RegistryModulePage } from "@/components/registry-module-page";

const activeLabel = (value: string) => ({ ACTIVE: "ปกติ", OCCUPIED: "มีผู้อยู่อาศัย", VACANT: "ว่าง", ARCHIVED: "เก็บประวัติ", RESIDENT: "อาศัยอยู่", MOVED_IN: "ย้ายเข้า", MOVED_OUT: "ย้ายออก", OPEN: "รอชำระ", PARTIALLY_PAID: "ชำระบางส่วน", PAID: "ชำระแล้ว", OVERDUE: "เกินกำหนด", NEEDS_REVIEW: "รอตรวจ", PENDING: "รออนุมัติ", APPROVED: "อนุมัติแล้ว", REJECTED: "ปฏิเสธ", APPLIED: "ยื่นคำขอ", ACTIVE_LOAN: "กำลังชำระ", COMPLETED: "ขายแล้ว", INACTIVE: "ปิดใช้งาน" } as Record<string, string>)[value] ?? value;

export async function ModulePage({ id, searchParams }: { id: keyof typeof workspaces; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  if (id === "households" || id === "people") return <RegistryModulePage id={id} searchParams={searchParams} />;
  const config = workspaces[id];
  let initialRows = config.initialRows;
  let loadError = "";
  let requestId = "";
  let householdOptions: Array<{ id: string; house_number: string; moo: string }> = [];
  let onCreate: ((formData: FormData) => Promise<{ ok: boolean; message: string }>) | undefined;
  if (isSupabaseConfigured()) {
    const permission: Record<string, string> = { households: "registry.household.view", people: "registry.resident.view", billing: "water.invoice.view", readings: "water.reading.view", funds: "fund.view", loans: "loan.view", store: "store.view" };
    let allowed: boolean;
    try { ({ allowed } = await currentUserWithPermission(permission[id])); }
    catch (error) {
      const requestId = await logDataError(`module.${id}.authorization`, error);
      return <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">ตรวจสอบสิทธิ์หรือโหลดข้อมูลไม่สำเร็จ รหัสอ้างอิง {requestId}</p>;
    }
    if (!allowed) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">บัญชีนี้ไม่มีสิทธิ์ดูข้อมูลในโมดูลนี้</div>;
    try {
      const [result, householdOptionRows] = await Promise.all([
        id === "households" ? prisma.household.findMany({ select: { id: true, houseNumber: true, moo: true, road: true, subdistrict: true, district: true, province: true, postalCode: true, householdType: true, occupancyStatus: true, memberships: { select: { isHead: true, moveOutAt: true, resident: { select: { firstName: true, lastName: true } } } }, connections: { select: { status: true } } }, orderBy: { houseNumber: "asc" }, take: 1000 })
        : id === "people" ? prisma.resident.findMany({ select: { id: true, firstName: true, lastName: true, birthDate: true, phone: true, residencyStatus: true, memberships: { select: { relationship: true, moveOutAt: true, household: { select: { houseNumber: true } } } } }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], take: 1000 })
        : id === "billing" ? prisma.waterInvoice.findMany({ select: { id: true, invoiceNumber: true, periodEnd: true, totalAmount: true, paidAmount: true, status: true, connection: { select: { accountNumber: true, accountName: true, household: { select: { houseNumber: true } } } } }, orderBy: { periodEnd: "desc" }, take: 1000 })
        : id === "readings" ? prisma.meterReading.findMany({ select: { id: true, readingDate: true, readingValue: true, usage: true, status: true, meter: { select: { connection: { select: { accountName: true, household: { select: { houseNumber: true } } } } } } }, orderBy: { readingDate: "desc" }, take: 1000 })
        : id === "funds" ? prisma.fundTransaction.findMany({ select: { id: true, transactionNo: true, description: true, amount: true, type: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 1000 })
        : id === "loans" ? prisma.loan.findMany({ select: { id: true, contractNo: true, principal: true, status: true, product: { select: { name: true } }, borrower: { select: { resident: { select: { firstName: true, lastName: true } } } } }, orderBy: { appliedAt: "desc" }, take: 1000 })
        : prisma.product.findMany({ select: { id: true, sku: true, barcode: true, name: true, salePrice: true, stock: true, status: true, category: { select: { name: true } } }, orderBy: { name: "asc" }, take: 1000 }),
        id === "people" ? prisma.household.findMany({ where: { occupancyStatus: { not: "ARCHIVED" } }, select: { id: true, houseNumber: true, moo: true }, orderBy: { houseNumber: "asc" }, take: 1000 }) : Promise.resolve([]),
      ]);
      const normalize = (value: unknown): unknown => {
        if (value instanceof Date) return value.toISOString();
        if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") return value.toNumber();
        if (Array.isArray(value)) return value.map(normalize);
        if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`), normalize(item)]));
        return value;
      };
      const normalizedRows = (result as unknown[]).map(normalize) as Array<Record<string, unknown>>;
      householdOptions = householdOptionRows.map((item) => ({ id: item.id, house_number: item.houseNumber, moo: item.moo }));
      const data = normalizedRows;
      initialRows = data.map((row) => {
        const memberships = row.memberships as Array<Record<string, unknown>> | null;
        const membership = id === "people" ? memberships?.find((item) => !item.move_out_at) : memberships?.find((item) => !item.move_out_at && item.is_head) ?? memberships?.find((item) => !item.move_out_at);
        const resident = (membership?.resident ?? {}) as Record<string, unknown>;
        const household = (membership?.household ?? {}) as Record<string, unknown>;
        const connection = (row.connection ?? {}) as Record<string, unknown>;
        const nestedHousehold = (connection.household ?? {}) as Record<string, unknown>;
        const product = (row.product ?? {}) as Record<string, unknown>;
        const borrower = (row.borrower ?? {}) as Record<string, unknown>;
        const borrowerResident = (borrower.resident ?? {}) as Record<string, unknown>;
        const category = (row.category ?? {}) as Record<string, unknown>;
        const fullName = `${resident.first_name ?? borrowerResident.first_name ?? ""} ${resident.last_name ?? borrowerResident.last_name ?? ""}`.trim();
        const idValue = String(row.invoice_number ?? row.contract_no ?? row.transaction_no ?? row.sku ?? row.id ?? "");
        const address = [row.road, row.subdistrict, row.district, row.province, row.postal_code].map((value) => String(value ?? "").trim()).filter(Boolean).join(" ");
        const householdType = ({ residential: "ที่อยู่อาศัย", commercial: "พาณิชยกรรม", mixed: "ผสม", RESIDENTIAL: "ที่อยู่อาศัย", COMMERCIAL: "พาณิชยกรรม", MIXED: "ผสม" } as Record<string, string>)[String(row.household_type ?? "")] ?? "—";
        const currentMemberships = memberships?.filter((item) => !item.move_out_at) ?? [];
        const head = id === "households" ? currentHouseholdHeadLabel((memberships ?? []).map((item) => ({ isHead: item.is_head === true, moveOutAt: item.move_out_at, resident: { firstName: String((item.resident as Record<string, unknown> | null)?.first_name ?? ""), lastName: String((item.resident as Record<string, unknown> | null)?.last_name ?? "") } }))) : fullName || "—";
        const mapped: Record<string, string | number | boolean> = { id: idValue, detailId: String(row.id ?? ""), houseNumber: String(row.house_number ?? nestedHousehold.house_number ?? (household.house_number as string) ?? "—"), moo: String(row.moo ?? "—"), address: address || "—", head, members: currentMemberships.length, waterStatus: activeLabel(String((row.connections as Array<Record<string, unknown>> | null)?.[0]?.status ?? "ACTIVE")), status: activeLabel(String(row.occupancy_status ?? row.residency_status ?? "").toUpperCase()), name: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || String(connection.account_name ?? "—"), household: String((household.house_number as string) ?? nestedHousehold.house_number ?? (id === "people" && !membership ? "ย้ายออกแล้ว" : "—")), relationship: String(membership?.relationship ?? "—"), birthDate: row.birth_date ? formatThaiDate(String(row.birth_date)) : "ไม่ระบุ", phone: String(row.phone ?? "ไม่ระบุ"), period: row.period_end ? new Date(String(row.period_end)).toLocaleDateString("th-TH", { month: "short", year: "numeric", timeZone: "Asia/Bangkok" }) : "—", amount: Number(row.total_amount ?? row.principal ?? row.sale_price ?? row.amount ?? 0), paid: Number(row.paid_amount ?? 0), date: String(row.created_at ?? "").slice(0, 10), description: String(row.description ?? row.name ?? "—"), member: fullName || "—", type: householdType === "—" ? String(row.type ?? "—") : householdType, borrower: fullName || "—", product: String(product.name ?? "—"), principal: Number(row.principal ?? 0), remaining: Number(row.principal ?? 0), nextDue: "—", barcode: String(row.barcode ?? "—"), category: String(category.name ?? "—"), price: Number(row.sale_price ?? 0), stock: Number(row.stock ?? 0), previous: 0, current: Number(row.reading_value ?? 0), usage: Number(row.usage ?? 0) };
        mapped.status = activeLabel(String(row.status ?? mapped.status));
        return mapped as DemoRow;
      });
    } catch (error) { initialRows = []; requestId = await logDataError(`module.${id}.load`, error); loadError = `โหลดข้อมูลไม่สำเร็จ รหัสอ้างอิง ${requestId}`; }
    if (id === "households") onCreate = createHouseholdFormAction;
    if (id === "people") onCreate = createResidentFormAction;
  }
  const fields = id === "people" ? config.fields.map((field) => field.key === "householdId" ? { ...field, options: (householdOptions ?? []).map((item) => ({ value: item.id, label: `บ้านเลขที่ ${item.house_number} · หมู่ ${item.moo}` })) } : field) : config.fields;
  return <div className="space-y-3">{loadError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">{loadError}</p>}<DataWorkspace {...config} fields={fields} initialRows={initialRows} onCreate={onCreate} readOnly={isSupabaseConfigured() && !onCreate} /></div>;
}
