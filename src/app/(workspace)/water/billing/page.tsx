import { WaterBilling } from "@/components/water-billing";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";

export default async function BillingPage() {
  if (!isSupabaseConfigured()) return <WaterBilling />;
  const supabase = await createServerSupabaseClient();
  const [{ data: allowed }, { data, error }, { data: readingData }] = await Promise.all([
    supabase.rpc("has_permission", { permission_key: "water.invoice.view" }),
    supabase.from("water_invoices").select("id,invoice_number,period_end,total_amount,paid_amount,status,connection:water_connections(account_name,household:households(house_number))").order("period_end", { ascending: false }).limit(1000),
    supabase.from("meter_readings").select("id,usage,meter:water_meters(connection:water_connections(account_name,household:households(house_number))),invoice:water_invoices(id)").eq("status", "recorded").order("reading_date", { ascending: false }).limit(1000),
  ]);
  if (!allowed) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">บัญชีนี้ไม่มีสิทธิ์ดูใบแจ้งหนี้</p>;
  if (error) return <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">โหลดใบแจ้งหนี้ไม่สำเร็จ ตรวจสอบ migration และ RLS</div>;
  const statusLabel: Record<string, string> = { open: "รอชำระ", partially_paid: "ชำระบางส่วน", paid: "ชำระแล้ว", overdue: "เกินกำหนด", needs_review: "รอตรวจมิเตอร์", void: "ยกเลิก" };
  const rows = (data ?? []).map((invoice) => {
    const connection = invoice.connection as unknown as { account_name: string; household: { house_number: string } | null } | null;
    return { id: invoice.invoice_number, invoiceId: invoice.id, houseNumber: connection?.household?.house_number ?? "—", name: connection?.account_name ?? "—", period: new Date(`${invoice.period_end}T00:00:00+07:00`).toLocaleDateString("th-TH", { month: "short", year: "numeric", timeZone: "Asia/Bangkok" }), amount: Number(invoice.total_amount), paid: Number(invoice.paid_amount), status: statusLabel[invoice.status] ?? invoice.status };
  });
  const eligibleReadings = (readingData ?? []).filter((reading) => !reading.invoice).map((reading) => {
    const meter = reading.meter as unknown as { connection: { account_name: string; household: { house_number: string } | null } | null } | null;
    return { id: reading.id, usage: Number(reading.usage ?? 0), houseNumber: meter?.connection?.household?.house_number ?? "—", name: meter?.connection?.account_name ?? "—" };
  });
  return <WaterBilling key={rows.map((row) => `${row.id}:${row.paid}:${row.status}`).join("|")} initialRows={rows} isDemo={false} eligibleReadings={eligibleReadings} />;
}
