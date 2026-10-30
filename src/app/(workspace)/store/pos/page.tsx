import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { PointOfSale } from "@/components/point-of-sale";

export default async function PosPage() {
  if (!isSupabaseConfigured()) return <PointOfSale />;
  const supabase = await createServerSupabaseClient();
  const [{ data: allowed }, { data, error }] = await Promise.all([
    supabase.rpc("has_permission", { permission_key: "store.view" }),
    supabase.from("products").select("id,barcode,sku,name,sale_price,stock,reorder_at,status").eq("status", "active").order("name").limit(1000),
  ]);
  if (!allowed) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">บัญชีนี้ไม่มีสิทธิ์เข้าถึงหน้าขายสินค้า</p>;
  if (error) return <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">โหลดสินค้าไม่สำเร็จ ตรวจสอบ migration และ RLS</p>;
  const products = (data ?? []).map((product) => ({ id: product.id, barcode: product.barcode ?? product.sku, sku: product.sku, name: product.name, price: Number(product.sale_price), stock: Number(product.stock), reorderAt: Number(product.reorder_at), status: Number(product.stock) <= Number(product.reorder_at) ? "ใกล้หมด" : "พร้อมขาย" }));
  return <PointOfSale key={products.map((product) => `${product.id}:${product.stock}`).join("|")} initialProducts={products} isDemo={false} />;
}
