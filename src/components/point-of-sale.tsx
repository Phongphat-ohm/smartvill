"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Barcode, Check, LoaderCircle, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import Swal from "sweetalert2";
import { productRows as initialProducts, type DemoRow } from "@/lib/demo-data";
import { formatCurrency } from "@/lib/format";
import { recordShopSaleAction } from "@/app/actions";

const alertOptions = { customClass: { popup: "village-swal" } };
type CartLine = { product: DemoRow; quantity: number };

export function PointOfSale({ initialProducts: productsFromServer = initialProducts, isDemo = true }: { initialProducts?: DemoRow[]; isDemo?: boolean }) {
  const router = useRouter();
  const [products, setProducts] = useState(productsFromServer);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("cash");
  const [checkingOut, setCheckingOut] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const total = useMemo(() => cart.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0), [cart]);
  const filteredProducts = products.filter((product) => `${product.name} ${product.barcode}`.toLowerCase().includes(query.toLowerCase()));

  function addProduct(product: DemoRow) {
    if (Number(product.stock) <= 0) {
      void Swal.fire({ ...alertOptions, icon: "warning", title: "สินค้าหมด", text: `${product.name} ไม่มีสินค้าในสต็อก` });
      return;
    }
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) return current.map((line) => line.product.id === product.id ? { ...line, quantity: Math.min(line.quantity + 1, Number(product.stock)) } : line);
      return [...current, { product, quantity: 1 }];
    });
    setQuery("");
    searchRef.current?.focus();
  }

  function updateQuantity(productId: unknown, amount: number) {
    setCart((current) => current.flatMap((line) => {
      if (line.product.id !== productId) return [line];
      const quantity = Math.min(Number(line.product.stock), line.quantity + amount);
      return quantity < 1 ? [] : [{ ...line, quantity }];
    }));
  }

  async function checkout() {
    if (!cart.length || checkingOut) return;
    const result = await Swal.fire({ ...alertOptions, title: "ยืนยันการขาย", html: `รับชำระ <strong>${formatCurrency(total)}</strong> และตัดสต็อกสินค้า ${cart.length} รายการหรือไม่?`, icon: "question", showCancelButton: true, confirmButtonText: "ยืนยันการขาย", cancelButtonText: "กลับไปแก้ไข" });
    if (!result.isConfirmed) return;
    if (!isDemo) {
      setCheckingOut(true);
      try {
        const response = await recordShopSaleAction(cart.map((line) => ({ productId: String(line.product.id), quantity: line.quantity })), method);
        if (!response.ok) { await Swal.fire({ ...alertOptions, icon: "error", title: "ขายไม่สำเร็จ", text: response.message }); return; }
        setCart([]);
        router.refresh();
        await Swal.fire({ ...alertOptions, icon: "success", title: "บันทึกการขายแล้ว", text: response.message, confirmButtonColor: "#008BF8" });
      } catch (cause) {
        await Swal.fire({ ...alertOptions, icon: "error", title: "ขายไม่สำเร็จ", text: cause instanceof Error ? cause.message : "กรุณาลองอีกครั้ง" });
      } finally {
        setCheckingOut(false);
      }
      return;
    }
    setProducts((current) => current.map((product) => {
      const sold = cart.find((line) => line.product.id === product.id)?.quantity ?? 0;
      return sold ? { ...product, stock: Math.max(0, Number(product.stock) - sold), status: Number(product.stock) - sold <= Number(product.reorderAt) ? "ใกล้หมด" : "พร้อมขาย" } : product;
    }));
    setCart([]);
    await Swal.fire({ ...alertOptions, icon: "success", title: "บันทึกการขายแล้ว", text: `รับเงิน ${formatCurrency(total)} · ออกใบเสร็จหน้าร้านเรียบร้อย`, confirmButtonText: "เสร็จสิ้น" });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-[24px] font-bold tracking-[-0.03em] text-slate-900 sm:text-[28px]">จุดขาย POS</h1><p className="mt-1 text-[13px] text-slate-500">ร้านค้าหมู่บ้าน · สแกนสินค้าและบันทึกยอดขาย</p></div><span className="w-fit rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[11px] text-slate-600">แคชเชียร์: สมชาย ใจดี</span></div>
      <div className="grid items-start gap-5 xl:grid-cols-[1.45fr_0.8fr]">
        <section className="rounded-2xl border border-[var(--border)] bg-white">
          <div className="space-y-4 border-b border-[var(--border)] p-4 sm:p-5">
            <div className="relative"><Barcode size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--primary)]" /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && filteredProducts[0]) { event.preventDefault(); addProduct(filteredProducts[0]); } }} aria-label="สแกนหรือค้นหาสินค้า" placeholder="สแกน barcode หรือค้นหาสินค้า..." className="h-11 w-full rounded-xl border border-blue-200 bg-blue-50/50 pl-10 pr-10 text-[12px] outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-3 focus:ring-blue-100" />{query && <button aria-label="ล้างคำค้น" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X size={15} /></button>}</div>
            <div className="flex items-center justify-between"><div><h2 className="text-[14px] font-bold text-slate-900">สินค้าในร้าน</h2><p className="mt-0.5 text-[10px] text-slate-500">เลือกสินค้าเพื่อเพิ่มลงในรายการขาย</p></div><span className="text-[10px] text-slate-400">{filteredProducts.length} รายการ</span></div>
          </div>
          <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">{filteredProducts.map((product) => <button key={String(product.id)} onClick={() => addProduct(product)} disabled={Number(product.stock) <= 0} className="flex items-center gap-3 border-b border-[var(--border)] p-4 text-left transition hover:bg-slate-50 disabled:opacity-45 sm:[&:nth-child(odd)]:border-r"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#edf6ff] text-[#1485e5]"><ShoppingBag size={18} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-semibold text-slate-800">{product.name}</span><span className="mt-1 block truncate text-[10px] text-slate-500">{product.category} · เหลือ {product.stock}</span></span><span className="shrink-0 text-[12px] font-bold tabular-nums text-slate-900">{formatCurrency(Number(product.price))}</span></button>)}</div>
          {filteredProducts.length === 0 && <p className="px-4 py-10 text-center text-[12px] text-slate-500">ไม่พบสินค้าที่ตรงกับคำค้น</p>}
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-white">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4 sm:px-5"><div><h2 className="text-[14px] font-bold text-slate-900">รายการขาย</h2><p className="mt-0.5 text-[10px] text-slate-500">{cart.reduce((sum, line) => sum + line.quantity, 0)} ชิ้น</p></div><button disabled={!cart.length} onClick={() => setCart([])} className="text-[10px] font-medium text-slate-400 hover:text-rose-600 disabled:opacity-40">ล้างรายการ</button></div>
          <div className="min-h-[180px] divide-y divide-slate-100 px-4 sm:px-5">{cart.length ? cart.map((line) => <div key={String(line.product.id)} className="flex items-center gap-2 py-3"><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-semibold text-slate-800">{line.product.name}</p><p className="mt-0.5 text-[10px] text-slate-500">{formatCurrency(Number(line.product.price))} / ชิ้น</p></div><div className="flex items-center gap-1"><button aria-label="ลดจำนวน" onClick={() => updateQuantity(line.product.id, -1)} className="flex size-7 items-center justify-center rounded-md border border-[var(--border)] text-slate-500 hover:bg-slate-50"><Minus size={12} /></button><span className="w-7 text-center text-[11px] font-semibold tabular-nums">{line.quantity}</span><button aria-label="เพิ่มจำนวน" onClick={() => updateQuantity(line.product.id, 1)} className="flex size-7 items-center justify-center rounded-md border border-[var(--border)] text-slate-500 hover:bg-slate-50"><Plus size={12} /></button></div><span className="w-[76px] text-right text-[11px] font-semibold tabular-nums">{formatCurrency(Number(line.product.price) * line.quantity)}</span><button aria-label="นำสินค้าออก" onClick={() => setCart((current) => current.filter((item) => item.product.id !== line.product.id))} className="rounded p-1 text-slate-300 hover:text-rose-600"><Trash2 size={13} /></button></div>) : <div className="flex min-h-[180px] flex-col items-center justify-center text-center"><span className="flex size-10 items-center justify-center rounded-full bg-slate-50 text-slate-400"><ShoppingBag size={17} /></span><p className="mt-2 text-[11px] font-medium text-slate-600">ยังไม่มีสินค้าในรายการ</p><p className="mt-1 text-[10px] text-slate-400">สแกน barcode หรือเลือกสินค้าจากรายการ</p></div>}</div>
          <div className="space-y-3 border-t border-[var(--border)] p-4 sm:p-5"><div className="flex items-center justify-between text-[11px] text-slate-500"><span>ยอดรวม</span><span>{formatCurrency(total)}</span></div><div className="flex items-center justify-between"><span className="text-[13px] font-bold text-slate-900">ยอดสุทธิ</span><span className="text-[22px] font-bold tracking-[-0.03em] text-slate-900">{formatCurrency(total)}</span></div><label className="block space-y-1.5"><span className="text-[10px] font-semibold text-slate-600">รับชำระโดย</span><select disabled={checkingOut} value={method} onChange={(event) => setMethod(event.target.value)} className="h-9 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-[11px] outline-none focus:border-blue-400 disabled:opacity-60"><option value="cash">เงินสด</option><option value="transfer">โอนเงิน</option><option value="other">อื่น ๆ</option></select></label><button disabled={!cart.length || checkingOut} onClick={checkout} aria-busy={checkingOut} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] text-[12px] font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:bg-slate-300">{checkingOut ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}{checkingOut ? "กำลังบันทึกการขาย..." : "บันทึกการขาย"}</button><p className="text-center text-[9px] leading-4 text-slate-400">ยอดขายจะบันทึกเป็นรายการรับเงินและตัดสต็อกเมื่อยืนยัน</p></div>
        </section>
      </div>
    </div>
  );
}
