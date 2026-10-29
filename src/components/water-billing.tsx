"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CreditCard, Search } from "lucide-react";
import Swal from "sweetalert2";
import { invoiceRows as demoRows, type DemoRow } from "@/lib/demo-data";
import { generateWaterInvoiceAction, recordWaterPaymentFormAction } from "@/app/actions";
import { applyWaterPayment } from "@/lib/domain/water";
import { formatCurrency } from "@/lib/format";

const alertOptions = { customClass: { popup: "village-swal" } };

type EligibleReading = { id: string; houseNumber: string; name: string; usage: number };

export function WaterBilling({ initialRows = demoRows, isDemo = true, eligibleReadings = [] }: { initialRows?: DemoRow[]; isDemo?: boolean; eligibleReadings?: EligibleReading[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<DemoRow[]>(initialRows);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DemoRow | null>(null);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const totals = useMemo(() => ({ billed: rows.reduce((sum, row) => sum + Number(row.amount), 0), paid: rows.reduce((sum, row) => sum + Number(row.paid), 0), outstanding: rows.reduce((sum, row) => sum + Number(row.amount) - Number(row.paid), 0) }), [rows]);
  const filtered = rows.filter((row) => `${row.id} ${row.houseNumber} ${row.name}`.toLowerCase().includes(query.toLowerCase()));

  function openPayment(row: DemoRow) { setSelected(row); setError(""); formRef.current?.reset(); dialogRef.current?.showModal(); }

  async function savePayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const balance = Number(selected.amount) - Number(selected.paid);
    const amount = Number(values.amount);
    try {
      const result = applyWaterPayment(balance, amount);
      if (!isDemo) {
        const formData = new FormData(); formData.set("invoiceId", String(selected.invoiceId ?? selected.id)); formData.set("amount", String(amount)); formData.set("method", String(values.method)); formData.set("reference", String(values.reference ?? ""));
        const response = await recordWaterPaymentFormAction(formData);
        if (!response.ok) { setError(response.message); return; }
        dialogRef.current?.close(); router.refresh();
        await Swal.fire({ ...alertOptions, icon: "success", title: "บันทึกการรับชำระแล้ว", text: response.message, confirmButtonText: "ปิด" });
        return;
      }
      const method = values.method === "cash" ? "เงินสด" : values.method === "transfer" ? "โอนเงิน" : "อื่น ๆ";
      setRows((currentRows) => currentRows.map((row) => row.id === selected.id ? { ...row, paid: Number(row.paid) + amount, status: result.status === "paid" ? "ชำระแล้ว" : "ชำระบางส่วน" } : row));
      dialogRef.current?.close();
      await Swal.fire({ ...alertOptions, icon: "success", title: "บันทึกการรับชำระแล้ว", html: `รับชำระ ${formatCurrency(amount)} ผ่าน${method}<br/>ยอดคงเหลือ ${formatCurrency(result.remaining)}`, confirmButtonText: "ปิด" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "บันทึกยอดชำระไม่สำเร็จ");
    }
  }

  async function issueInvoice(reading: EligibleReading) {
    if (isDemo) { await Swal.fire({ ...alertOptions, icon: "info", title: "โหมดสาธิต", text: "การออกบิลจริงต้องใช้เลขมิเตอร์ที่บันทึกและอัตราที่ตั้งไว้ในฐานข้อมูล" }); return; }
    const result = await Swal.fire({ ...alertOptions, title: "ออกใบแจ้งหนี้", text: `บ้านเลขที่ ${reading.houseNumber} · ใช้น้ำ ${reading.usage} ม³`, icon: "question", showCancelButton: true, confirmButtonText: "ออกใบแจ้งหนี้", cancelButtonText: "ยกเลิก" });
    if (!result.isConfirmed) return;
    const response = await generateWaterInvoiceAction(reading.id);
    if (!response.ok) { await Swal.fire({ ...alertOptions, icon: "error", title: "ออกบิลไม่สำเร็จ", text: response.message }); return; }
    router.refresh();
    await Swal.fire({ ...alertOptions, icon: "success", title: "ออกใบแจ้งหนี้แล้ว", text: response.message });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-[24px] font-bold tracking-[-0.03em] text-slate-900 sm:text-[28px]">ใบแจ้งหนี้ค่าน้ำ</h1><p className="mt-1 text-[13px] text-slate-500">รอบเดือนตุลาคม 2569 · รับชำระและติดตามยอดค้าง</p></div>{isDemo && <button onClick={() => Swal.fire({ ...alertOptions, icon: "info", title: "การออกบิล", text: "โหมดสาธิตไม่เชื่อมฐานข้อมูล", confirmButtonText: "รับทราบ" })} className="h-10 rounded-lg bg-[var(--primary)] px-4 text-[12px] font-semibold text-white hover:bg-[var(--primary-hover)]">ตัวอย่างการออกบิล</button>}</div>
      <section className="grid grid-cols-3 divide-x divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-white px-2 py-4 sm:px-5"><div className="px-3 sm:px-4"><p className="text-[10px] text-slate-500 sm:text-[11px]">ยอดเรียกเก็บ</p><p className="mt-1.5 text-[16px] font-bold text-slate-900 sm:text-[20px]">{formatCurrency(totals.billed)}</p></div><div className="px-3 sm:px-5"><p className="text-[10px] text-slate-500 sm:text-[11px]">รับชำระแล้ว</p><p className="mt-1.5 text-[16px] font-bold text-emerald-700 sm:text-[20px]">{formatCurrency(totals.paid)}</p></div><div className="px-3 sm:px-5"><p className="text-[10px] text-slate-500 sm:text-[11px]">ยอดคงค้าง</p><p className="mt-1.5 text-[16px] font-bold text-amber-700 sm:text-[20px]">{formatCurrency(totals.outstanding)}</p></div></section>
      {!isDemo && <section className="rounded-2xl border border-[var(--border)] bg-white"><div className="border-b border-[var(--border)] px-5 py-4"><h2 className="text-[14px] font-bold text-slate-900">เลขมิเตอร์ที่พร้อมออกบิล</h2><p className="mt-0.5 text-[11px] text-slate-500">ระบบจะใช้สำเนาอัตราที่มีผลในวันที่อ่านและป้องกันการออกบิลซ้ำ</p></div>{eligibleReadings.length ? <div className="divide-y divide-slate-100">{eligibleReadings.map((reading) => <div key={reading.id} className="flex items-center justify-between gap-3 px-5 py-3"><div><p className="text-[12px] font-semibold text-slate-800">บ้านเลขที่ {reading.houseNumber} · {reading.name}</p><p className="mt-1 text-[10px] text-slate-500">ใช้น้ำ {reading.usage} ม³</p></div><button onClick={() => void issueInvoice(reading)} className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-2 text-[10px] font-semibold text-slate-700 hover:bg-slate-50">ออกใบแจ้งหนี้</button></div>)}</div> : <p className="px-5 py-6 text-center text-[11px] text-slate-500">ไม่มีรายการรอออกบิล</p>}</section>}
      <section className="rounded-2xl border border-[var(--border)] bg-white">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h2 className="text-[14px] font-bold text-slate-900">รายการเรียกเก็บ</h2><p className="mt-0.5 text-[11px] text-slate-500">รับชำระบางส่วนได้และออกใบเสร็จทุกครั้ง</p></div><label className="relative w-full sm:max-w-[310px]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="ค้นหาใบแจ้งหนี้" placeholder="ค้นหาเลขที่บิล ชื่อ หรือบ้านเลขที่..." className="h-9 w-full rounded-lg border border-[var(--border)] pl-9 pr-3 text-[11px] outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100" /></label></div>
        <div className="hidden overflow-x-auto md:block"><table className="w-full text-left"><thead className="bg-slate-50/80"><tr>{["เลขที่บิล", "บ้านเลขที่", "ผู้ใช้น้ำ", "รอบบิล", "ยอดบิล", "ชำระแล้ว", "คงเหลือ", "สถานะ", ""].map((header) => <th key={header} className="h-11 whitespace-nowrap border-b border-[var(--border)] px-3 text-[10px] font-semibold text-slate-500 first:pl-5">{header}</th>)}</tr></thead><tbody>{filtered.map((row) => { const balance = Number(row.amount) - Number(row.paid); return <tr key={String(row.id)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"><td className="h-[58px] whitespace-nowrap pl-5 pr-3 text-[11px] font-semibold text-slate-800">{row.id}</td><td className="px-3 text-[11px] text-slate-700">{row.houseNumber}</td><td className="px-3 text-[11px] text-slate-700">{row.name}</td><td className="px-3 text-[11px] text-slate-600">{row.period}</td><td className="px-3 text-[11px] tabular-nums">{formatCurrency(Number(row.amount))}</td><td className="px-3 text-[11px] tabular-nums text-emerald-700">{formatCurrency(Number(row.paid))}</td><td className="px-3 text-[11px] font-semibold tabular-nums">{formatCurrency(balance)}</td><td className="px-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${row.status === "ชำระแล้ว" ? "bg-emerald-50 text-emerald-700" : row.status === "เกินกำหนด" ? "bg-rose-50 text-rose-700" : /ตรวจ|อ่าน/.test(String(row.status)) ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-800"}`}>{String(row.status)}</span></td><td className="px-3 text-right">{balance > 0 && !String(row.status).includes("ตรวจ") && !String(row.status).includes("อ่าน") && <button onClick={() => openPayment(row)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"><CreditCard size={12} />รับชำระ</button>}</td></tr>; })}</tbody></table></div>
        <div className="divide-y divide-slate-100 md:hidden">{filtered.map((row) => { const balance = Number(row.amount) - Number(row.paid); return <article key={String(row.id)} className="space-y-2.5 px-4 py-3.5"><div className="flex items-start justify-between gap-3"><div><p className="text-[12px] font-semibold text-slate-800">บ้านเลขที่ {row.houseNumber} · {row.name}</p><p className="mt-0.5 text-[10px] text-slate-500">{row.id} · {row.period}</p></div><span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-800">{String(row.status)}</span></div><div className="flex items-center justify-between"><p className="text-[10px] text-slate-500">คงเหลือ <strong className="text-slate-800">{formatCurrency(balance)}</strong></p>{balance > 0 && <button onClick={() => openPayment(row)} className="text-[10px] font-semibold text-[#0075d1]">รับชำระ</button>}</div></article>; })}</div>
        {filtered.length === 0 && <p className="py-12 text-center text-[12px] text-slate-500">ไม่พบใบแจ้งหนี้</p>}
      </section>

      <dialog ref={dialogRef} className="m-auto w-[calc(100%-28px)] max-w-[440px] rounded-2xl border border-[var(--border)] bg-white p-0 text-slate-900 shadow-[0_24px_70px_rgb(19_42_71_/_18%)] backdrop:bg-slate-950/35"><form ref={formRef} onSubmit={savePayment} className="space-y-5 p-5 sm:p-6"><div><h2 className="text-[18px] font-bold">รับชำระค่าน้ำ</h2><p className="mt-1 text-[12px] text-slate-500">{selected?.id} · บ้านเลขที่ {selected?.houseNumber}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] text-slate-500">ยอดคงเหลือ</p><p className="mt-1 text-[19px] font-bold">{selected ? formatCurrency(Number(selected.amount) - Number(selected.paid)) : "—"}</p></div><label className="block space-y-1.5"><span className="text-[11px] font-semibold">ยอดรับชำระ <span className="text-rose-500">*</span></span><input name="amount" type="number" min="0.01" step="0.01" max={selected ? Number(selected.amount) - Number(selected.paid) : undefined} required className="h-11 w-full rounded-lg border border-[var(--border)] px-3 text-[14px] outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100" placeholder="ระบุยอดเงิน" /></label><label className="block space-y-1.5"><span className="text-[11px] font-semibold">ช่องทางรับเงิน</span><select name="method" className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-[12px] outline-none focus:border-blue-400"><option value="cash">เงินสด</option><option value="transfer">โอนเงิน</option><option value="other">อื่น ๆ</option></select></label><label className="block space-y-1.5"><span className="text-[11px] font-semibold">เลขอ้างอิง (ถ้ามี)</span><input name="reference" className="h-10 w-full rounded-lg border border-[var(--border)] px-3 text-[12px] outline-none focus:border-blue-400" /></label>{error && <p role="alert" className="text-[11px] text-rose-700">{error}</p>}<div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4"><button type="button" onClick={() => dialogRef.current?.close()} className="h-9 rounded-lg border border-[var(--border)] px-3.5 text-[11px] font-semibold text-slate-600">ยกเลิก</button><button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-[11px] font-semibold text-white"><Check size={14} />ยืนยันรับเงิน</button></div></form></dialog>
    </div>
  );
}
