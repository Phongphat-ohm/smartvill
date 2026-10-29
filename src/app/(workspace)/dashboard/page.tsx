import { Dashboard } from "@/components/dashboard";
import { LiveDashboard, type DashboardSnapshot } from "@/components/live-dashboard";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";

export default async function DashboardPage() {
  if (!isSupabaseConfigured()) return <Dashboard />;
  const supabase = await createServerSupabaseClient();
  const permissionKeys = ["registry.household.view", "registry.resident.view", "water.reading.view", "water.invoice.view"];
  const permissionResults = await Promise.all(permissionKeys.map((permission_key) => supabase.rpc("has_permission", { permission_key })));
  const allowed = permissionResults.map((result) => result.data === true);
  const data: DashboardSnapshot = { households: null, residents: null, reviewReadings: null, unpaidInvoices: null, outstandingAmount: null, waterUsage: [], errors: [] };
  const jobs: Promise<void>[] = [];
  if (allowed[0]) jobs.push((async () => { const { count, error } = await supabase.from("households").select("id", { count: "exact", head: true }).eq("occupancy_status", "occupied"); if (error) data.errors.push("households"); else data.households = count ?? 0; })());
  if (allowed[1]) jobs.push((async () => { const { count, error } = await supabase.from("residents").select("id", { count: "exact", head: true }).eq("residency_status", "resident"); if (error) data.errors.push("residents"); else data.residents = count ?? 0; })());
  if (allowed[2]) jobs.push((async () => {
    const [{ count, error }, { data: usage, error: usageError }] = await Promise.all([
      supabase.from("meter_readings").select("id", { count: "exact", head: true }).eq("status", "needs_review"),
      supabase.rpc("dashboard_water_usage"),
    ]);
    if (error || usageError) data.errors.push("water"); else {
      data.reviewReadings = count ?? 0;
      const months = (usage ?? []) as Array<{ month_start: string; usage: number }>;
      data.waterUsage = months.map((item) => ({ month: new Date(`${item.month_start}T00:00:00+07:00`).toLocaleDateString("th-TH", { month: "short", timeZone: "Asia/Bangkok" }), use: Number(item.usage ?? 0) }));
    }
  })());
  if (allowed[3]) jobs.push((async () => { const { count, error } = await supabase.from("water_invoices").select("id", { count: "exact", head: true }).in("status", ["open", "partially_paid", "overdue"]); if (error) data.errors.push("invoices"); else data.unpaidInvoices = count ?? 0; })());
  await Promise.all(jobs);
  return <LiveDashboard data={data} />;
}
