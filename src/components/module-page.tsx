import { createHouseholdFormAction, createResidentFormAction } from "@/app/actions";
import { DataWorkspace } from "@/components/data-workspace";
import type { DemoRow } from "@/lib/demo-data";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { workspaces } from "@/lib/workspaces";

const activeLabel = (value: string) => ({ ACTIVE: "ปกติ", OCCUPIED: "มีผู้อยู่อาศัย", VACANT: "ว่าง", ARCHIVED: "เก็บประวัติ", RESIDENT: "อาศัยอยู่", MOVED_IN: "ย้ายเข้า", MOVED_OUT: "ย้ายออก", OPEN: "รอชำระ", PARTIALLY_PAID: "ชำระบางส่วน", PAID: "ชำระแล้ว", OVERDUE: "เกินกำหนด", NEEDS_REVIEW: "รอตรวจ", PENDING: "รออนุมัติ", APPROVED: "อนุมัติแล้ว", REJECTED: "ปฏิเสธ", APPLIED: "ยื่นคำขอ", ACTIVE_LOAN: "กำลังชำระ", COMPLETED: "ขายแล้ว", INACTIVE: "ปิดใช้งาน" } as Record<string, string>)[value] ?? value;

export async function ModulePage({ id }: { id: keyof typeof workspaces }) {
  const config = workspaces[id];
  let initialRows = config.initialRows;
  let loadError = "";
  let onCreate: ((formData: FormData) => Promise<{ ok: boolean; message: string }>) | undefined;
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    const permission: Record<string, string> = { households: "registry.household.view", people: "registry.resident.view", billing: "water.invoice.view", readings: "water.reading.view", funds: "fund.view", loans: "loan.view", store: "store.view" };
    const { data: allowed } = await supabase.rpc("has_permission", { permission_key: permission[id] });
    if (!allowed) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">บัญชีนี้ไม่มีสิทธิ์ดูข้อมูลในโมดูลนี้</div>;
    let result: { data: unknown[] | null; error: { message: string } | null };
    if (id === "households") result = await supabase.from("households").select("id,house_number,moo,occupancy_status,memberships(is_head,resident:residents(first_name,last_name)),connections(status)").order("house_number").limit(1000);
    else if (id === "people") result = await supabase.from("residents").select("id,first_name,last_name,phone,residency_status,memberships(relationship,household:households(house_number))").order("last_name").limit(1000);
    else if (id === "billing") result = await supabase.from("water_invoices").select("id,invoice_number,period_end,total_amount,paid_amount,status,connection:water_connections(account_number,account_name,household:households(house_number))").order("period_end", { ascending: false }).limit(1000);
    else if (id === "readings") result = await supabase.from("meter_readings").select("id,reading_date,reading_value,usage,status,meter:water_meters(connection:water_connections(account_name,household:households(house_number)))").order("reading_date", { ascending: false }).limit(1000);
    else if (id === "funds") result = await supabase.from("fund_transactions").select("id,transaction_no,description,amount,type,status,created_at").order("created_at", { ascending: false }).limit(1000);
    else if (id === "loans") result = await supabase.from("loans").select("id,contract_no,principal,status,product:loan_products(name),borrower:fund_members(resident:residents(first_name,last_name))").order("applied_at", { ascending: false }).limit(1000);
    else result = await supabase.from("products").select("id,sku,barcode,name,sale_price,stock,status,category:product_categories(name)").order("name").limit(1000);
    if (result.error) { initialRows = []; loadError = "โหลดข้อมูลไม่สำเร็จ ตรวจสอบ migration และสิทธิ์ของบัญชี"; }
    else {
      const data = (result.data ?? []) as Array<Record<string, unknown>>;
      initialRows = data.map((row) => {
        const memberships = row.memberships as Array<Record<string, unknown>> | null;
        const membership = memberships?.[0];
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
        const mapped: Record<string, string | number | boolean> = { id: idValue, houseNumber: String(row.house_number ?? nestedHousehold.house_number ?? (household.house_number as string) ?? "—"), head: fullName || "—", members: memberships?.length ?? 0, waterStatus: activeLabel(String((row.connections as Array<Record<string, unknown>> | null)?.[0]?.status ?? "ACTIVE")), status: activeLabel(String(row.occupancy_status ?? "")), name: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || String(connection.account_name ?? "—"), household: String((household.house_number as string) ?? nestedHousehold.house_number ?? "—"), relationship: String(membership?.relationship ?? "—"), phone: String(row.phone ?? "—"), period: row.period_end ? new Date(String(row.period_end)).toLocaleDateString("th-TH", { month: "short", year: "numeric", timeZone: "Asia/Bangkok" }) : "—", amount: Number(row.total_amount ?? row.principal ?? row.sale_price ?? row.amount ?? 0), paid: Number(row.paid_amount ?? 0), date: String(row.created_at ?? "").slice(0, 10), description: String(row.description ?? row.name ?? "—"), member: fullName || "—", type: String(row.type ?? "—"), borrower: fullName || "—", product: String(product.name ?? "—"), principal: Number(row.principal ?? 0), remaining: Number(row.principal ?? 0), nextDue: "—", barcode: String(row.barcode ?? "—"), category: String(category.name ?? "—"), price: Number(row.sale_price ?? 0), stock: Number(row.stock ?? 0), previous: 0, current: Number(row.reading_value ?? 0), usage: Number(row.usage ?? 0) };
        mapped.status = activeLabel(String(row.status ?? mapped.status));
        return mapped as DemoRow;
      });
    }
    if (id === "households") onCreate = createHouseholdFormAction;
    if (id === "people") onCreate = createResidentFormAction;
  }
  return <div className="space-y-3">{loadError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">{loadError}</p>}<DataWorkspace {...config} initialRows={initialRows} onCreate={onCreate} readOnly={isSupabaseConfigured() && !onCreate} /></div>;
}
