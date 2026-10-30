import { Dashboard } from "@/components/dashboard";
import { LiveDashboard, type DashboardSnapshot } from "@/components/live-dashboard";
import { hasPermission, getAuthenticatedProfile, logDataError } from "@/lib/data-access";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) return <Dashboard />;
  let profile: Awaited<ReturnType<typeof getAuthenticatedProfile>>;
  let allowed: boolean[];
  try {
    profile = await getAuthenticatedProfile();
    const keys = ["registry.household.view", "registry.resident.view", "water.reading.view", "water.invoice.view"];
    allowed = await Promise.all(keys.map((key) => hasPermission(key, profile)));
  } catch (error) {
    const requestId = await logDataError("dashboard.authorization", error);
    return <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">โหลดข้อมูลภาพรวมไม่สำเร็จ รหัสอ้างอิง {requestId}</p>;
  }
  const data: DashboardSnapshot = { households: null, residents: null, reviewReadings: null, unpaidInvoices: null, outstandingAmount: null, waterUsage: [], errors: [] };
  const jobs: Promise<void>[] = [];
  const run = async <T,>(key: string, load: () => Promise<T>, apply: (value: T) => void) => {
    try { apply(await load()); }
    catch (error) { data.errors.push(key); await logDataError(`dashboard.${key}`, error); }
  };
  if (allowed[0]) jobs.push(run("households", () => prisma.household.count({ where: { occupancyStatus: "OCCUPIED" } }), (value) => { data.households = value; }));
  if (allowed[1]) jobs.push(run("residents", () => prisma.resident.count({ where: { residencyStatus: { in: ["RESIDENT", "MOVED_IN"] } } }), (value) => { data.residents = value; }));
  if (allowed[2]) jobs.push(run("water", async () => {
    const since = new Date(); since.setMonth(since.getMonth() - 5, 1); since.setHours(0, 0, 0, 0);
    const [count, readings] = await Promise.all([
      prisma.meterReading.count({ where: { status: "NEEDS_REVIEW" } }),
      prisma.meterReading.findMany({ where: { status: "RECORDED", readingDate: { gte: since } }, select: { readingDate: true, usage: true } }),
    ]);
    const totals = new Map<string, number>();
    readings.forEach((item) => { if (item.usage !== null) { const month = item.readingDate.toISOString().slice(0, 7); totals.set(month, (totals.get(month) ?? 0) + Number(item.usage)); } });
    return { count, usage: [...totals.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, use]) => ({ month: new Date(`${month}-01T00:00:00+07:00`).toLocaleDateString("th-TH", { month: "short", timeZone: "Asia/Bangkok" }), use })) };
  }, (value) => { data.reviewReadings = value.count; data.waterUsage = value.usage; }));
  if (allowed[3]) jobs.push(run("invoices", () => prisma.waterInvoice.count({ where: { status: { in: ["OPEN", "PARTIALLY_PAID", "OVERDUE"] } } }), (value) => { data.unpaidInvoices = value; }));
  await Promise.all(jobs);
  return <LiveDashboard data={data} />;
}
