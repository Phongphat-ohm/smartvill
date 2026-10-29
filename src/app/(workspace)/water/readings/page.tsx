import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { WaterReadings } from "@/components/water-readings";

export default async function ReadingsPage() {
  if (!isSupabaseConfigured()) return <WaterReadings />;
  const supabase = await createServerSupabaseClient();
  const { data: allowed } = await supabase.rpc("has_permission", { permission_key: "water.reading.view" });
  if (!allowed) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">บัญชีนี้ไม่มีสิทธิ์ดูข้อมูลมิเตอร์</p>;
  const { data, error } = await supabase.from("water_meters").select("id,start_reading,connection:water_connections(account_name,household:households(house_number)),readings:meter_readings(id,reading_date,reading_value,usage,status)").is("removed_at", null).order("reading_date", { ascending: false, referencedTable: "meter_readings" }).limit(2, { referencedTable: "meter_readings" }).order("id").limit(1000);
  if (error) return <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">โหลดข้อมูลมิเตอร์ไม่สำเร็จ ตรวจสอบ migration และ RLS</div>;
  const month = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" }).format(new Date());
  const rows = (data ?? []).map((meter) => {
    const connection = meter.connection as unknown as { account_name: string; household: { house_number: string } | null } | null;
    const history = meter.readings ?? [];
    const reading = history[0];
    const inCurrentMonth = reading?.reading_date?.slice(0, 7) === month;
    return { id: meter.id, meterId: meter.id, readingId: reading?.id ?? "", houseNumber: connection?.household?.house_number ?? "—", name: connection?.account_name ?? "—", previous: Number((inCurrentMonth ? history[1]?.reading_value : reading?.reading_value) ?? meter.start_reading), current: inCurrentMonth ? Number(reading?.reading_value) : "—", usage: inCurrentMonth && reading?.usage !== null ? Number(reading?.usage) : "—", status: inCurrentMonth ? reading?.status === "needs_review" ? "รอตรวจ" : "บันทึกแล้ว" : "รออ่าน" };
  });
  return <WaterReadings key={rows.map((row) => `${row.id}:${row.current}:${row.status}`).join("|")} initialRows={rows} isDemo={false} />;
}
