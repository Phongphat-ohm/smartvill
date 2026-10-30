import { WaterReadings } from "@/components/water-readings";
import { currentUserWithPermission, logDataError } from "@/lib/data-access";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function ReadingsPage() {
  if (!isSupabaseConfigured()) return <WaterReadings />;
  const { allowed } = await currentUserWithPermission("water.reading.view");
  if (!allowed) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">บัญชีนี้ไม่มีสิทธิ์ดูข้อมูลมิเตอร์</p>;
  try {
    const meters = await prisma.waterMeter.findMany({
      where: { removedAt: null },
      select: { id: true, startReading: true, connection: { select: { accountName: true, household: { select: { houseNumber: true } } } }, readings: { select: { id: true, readingDate: true, readingValue: true, usage: true, status: true }, orderBy: { readingDate: "desc" }, take: 2 } },
      orderBy: { id: "asc" }, take: 1000,
    });
    const month = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" }).format(new Date());
    const rows = meters.map((meter) => {
      const [reading, previous] = meter.readings;
      const isCurrentMonth = reading?.readingDate.toISOString().slice(0, 7) === month;
      return { id: meter.id, meterId: meter.id, readingId: reading?.id ?? "", houseNumber: meter.connection.household.houseNumber, name: meter.connection.accountName, previous: Number((isCurrentMonth ? previous?.readingValue : reading?.readingValue) ?? meter.startReading), current: isCurrentMonth ? Number(reading?.readingValue) : "—", usage: isCurrentMonth && reading?.usage !== null ? Number(reading?.usage) : "—", status: isCurrentMonth ? reading?.status === "NEEDS_REVIEW" ? "รอตรวจ" : "บันทึกแล้ว" : "รออ่าน" };
    });
    return <WaterReadings key={rows.map((row) => `${row.id}:${row.current}:${row.status}`).join("|")} initialRows={rows} isDemo={false} />;
  } catch (error) {
    const requestId = await logDataError("water.readings.load", error);
    return <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">โหลดข้อมูลมิเตอร์ไม่สำเร็จ รหัสอ้างอิง {requestId}</div>;
  }
}
