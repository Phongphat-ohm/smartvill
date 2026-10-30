import { WaterBilling } from "@/components/water-billing";
import { currentUserWithPermission, logDataError } from "@/lib/data-access";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function BillingPage() {
  if (!isSupabaseConfigured()) return <WaterBilling />;
  const { allowed } = await currentUserWithPermission("water.invoice.view");
  if (!allowed) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">บัญชีนี้ไม่มีสิทธิ์ดูใบแจ้งหนี้</p>;
  try {
    const [invoices, readings] = await Promise.all([
      prisma.waterInvoice.findMany({ select: { id: true, invoiceNumber: true, periodEnd: true, totalAmount: true, paidAmount: true, status: true, connection: { select: { accountName: true, household: { select: { houseNumber: true } } } } }, orderBy: { periodEnd: "desc" }, take: 1000 }),
      prisma.meterReading.findMany({ where: { status: "RECORDED" }, select: { id: true, usage: true, invoice: { select: { id: true } }, meter: { select: { connection: { select: { accountName: true, household: { select: { houseNumber: true } } } } } } }, orderBy: { readingDate: "desc" }, take: 1000 }),
    ]);
    const labels: Record<string, string> = { OPEN: "รอชำระ", PARTIALLY_PAID: "ชำระบางส่วน", PAID: "ชำระแล้ว", OVERDUE: "เกินกำหนด", NEEDS_REVIEW: "รอตรวจมิเตอร์", VOID: "ยกเลิก" };
    const rows = invoices.map((invoice) => ({ id: invoice.invoiceNumber, invoiceId: invoice.id, houseNumber: invoice.connection.household.houseNumber, name: invoice.connection.accountName, period: new Date(`${invoice.periodEnd.toISOString().slice(0, 10)}T00:00:00+07:00`).toLocaleDateString("th-TH", { month: "short", year: "numeric", timeZone: "Asia/Bangkok" }), amount: Number(invoice.totalAmount), paid: Number(invoice.paidAmount), status: labels[invoice.status] ?? invoice.status.toLowerCase() }));
    const eligibleReadings = readings.filter((reading) => !reading.invoice).map((reading) => ({ id: reading.id, usage: Number(reading.usage ?? 0), houseNumber: reading.meter.connection.household.houseNumber, name: reading.meter.connection.accountName }));
    return <WaterBilling key={rows.map((row) => `${row.id}:${row.paid}:${row.status}`).join("|")} initialRows={rows} isDemo={false} eligibleReadings={eligibleReadings} />;
  } catch (error) {
    const requestId = await logDataError("water.billing.load", error);
    return <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">โหลดใบแจ้งหนี้ไม่สำเร็จ รหัสอ้างอิง {requestId}</div>;
  }
}
