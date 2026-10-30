import { DataWorkspace } from "@/components/data-workspace";
import { salesRows } from "@/lib/demo-data";
import { currentUserWithPermission, logDataError } from "@/lib/data-access";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function SalesHistoryPage() {
  let initialRows = salesRows;
  if (isSupabaseConfigured()) {
    const { allowed } = await currentUserWithPermission("store.view");
    if (!allowed) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">บัญชีนี้ไม่มีสิทธิ์ดูประวัติการขาย</p>;
    try {
      const rows = await prisma.sale.findMany({ select: { id: true, receiptNumber: true, totalAmount: true, paidAmount: true, paymentMethod: true, status: true, soldAt: true, items: { select: { productName: true, quantity: true, lineTotal: true } } }, orderBy: { soldAt: "desc" }, take: 1000 });
      initialRows = rows.map((sale) => ({ id: sale.receiptNumber, date: new Date(sale.soldAt).toLocaleDateString("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }), items: sale.items.map((item) => `${item.productName} × ${item.quantity}`).join(", "), amount: Number(sale.totalAmount), paid: Number(sale.paidAmount), method: sale.paymentMethod.toLowerCase(), status: sale.status === "COMPLETED" ? "สำเร็จ" : sale.status.toLowerCase() }));
    } catch (error) {
      const requestId = await logDataError("store.sales.load", error);
      return <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">โหลดประวัติการขายไม่สำเร็จ รหัสอ้างอิง {requestId}</p>;
    }
  }
  return <DataWorkspace title="ประวัติการขาย" description="ใบเสร็จ รายการสินค้า และยอดรับชำระจากจุดขาย" actionLabel="บันทึกการขาย" searchPlaceholder="ค้นหาเลขใบเสร็จหรือชื่อสินค้า..." columns={[{ key: "id", label: "ใบเสร็จ" }, { key: "date", label: "วันที่" }, { key: "items", label: "รายการสินค้า" }, { key: "amount", label: "ยอดขาย", kind: "money" }, { key: "paid", label: "รับแล้ว", kind: "money" }, { key: "method", label: "ช่องทาง" }, { key: "status", label: "สถานะ", kind: "status" }]} fields={[]} initialRows={initialRows} readOnly />;
}
