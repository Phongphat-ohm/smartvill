import { DataWorkspace } from "@/components/data-workspace";
import { salesRows } from "@/lib/demo-data";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";

export default async function SalesHistoryPage() {
  let initialRows = salesRows;
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    const [{ data: allowed }, { data, error }] = await Promise.all([
      supabase.rpc("has_permission", { permission_key: "store.view" }),
      supabase.from("sales").select("id,receipt_number,total_amount,paid_amount,payment_method,status,sold_at,items:sale_items(product_name,quantity,line_total)").order("sold_at", { ascending: false }).limit(1000),
    ]);
    if (!allowed) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">บัญชีนี้ไม่มีสิทธิ์ดูประวัติการขาย</p>;
    if (error) return <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">โหลดประวัติการขายไม่สำเร็จ ตรวจสอบ migration และ RLS</p>;
    initialRows = (data ?? []).map((sale) => ({ id: sale.receipt_number, date: new Date(sale.sold_at).toLocaleDateString("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }), items: sale.items.map((item) => `${item.product_name} × ${item.quantity}`).join(", "), amount: Number(sale.total_amount), paid: Number(sale.paid_amount), method: sale.payment_method, status: sale.status === "completed" ? "สำเร็จ" : sale.status }));
  }
  return <DataWorkspace title="ประวัติการขาย" description="ใบเสร็จ รายการสินค้า และยอดรับชำระจากจุดขาย" actionLabel="บันทึกการขาย" searchPlaceholder="ค้นหาเลขใบเสร็จหรือชื่อสินค้า..." columns={[{ key: "id", label: "ใบเสร็จ" }, { key: "date", label: "วันที่" }, { key: "items", label: "รายการสินค้า" }, { key: "amount", label: "ยอดขาย", kind: "money" }, { key: "paid", label: "รับแล้ว", kind: "money" }, { key: "method", label: "ช่องทาง" }, { key: "status", label: "สถานะ", kind: "status" }]} fields={[]} initialRows={initialRows} readOnly />;
}
