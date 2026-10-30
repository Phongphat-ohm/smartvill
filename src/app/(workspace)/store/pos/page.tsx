import { PointOfSale } from "@/components/point-of-sale";
import { currentUserWithPermission, logDataError } from "@/lib/data-access";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function PosPage() {
  if (!isSupabaseConfigured()) return <PointOfSale />;
  const { allowed } = await currentUserWithPermission("store.view");
  if (!allowed) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">บัญชีนี้ไม่มีสิทธิ์เข้าถึงหน้าขายสินค้า</p>;
  try {
    const rows = await prisma.product.findMany({ where: { status: "ACTIVE" }, select: { id: true, barcode: true, sku: true, name: true, salePrice: true, stock: true, reorderAt: true }, orderBy: { name: "asc" }, take: 1000 });
    const products = rows.map((product) => ({ id: product.id, barcode: product.barcode ?? product.sku, sku: product.sku, name: product.name, price: Number(product.salePrice), stock: Number(product.stock), reorderAt: Number(product.reorderAt), status: Number(product.stock) <= Number(product.reorderAt) ? "ใกล้หมด" : "พร้อมขาย" }));
    return <PointOfSale key={products.map((product) => `${product.id}:${product.stock}`).join("|")} initialProducts={products} isDemo={false} />;
  } catch (error) {
    const requestId = await logDataError("store.pos.load", error);
    return <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">โหลดสินค้าไม่สำเร็จ รหัสอ้างอิง {requestId}</p>;
  }
}
