"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Droplets, Search, TriangleAlert, Plus, Check, LoaderCircle } from "lucide-react";
import Swal from "sweetalert2";
import { readingRows as demoRows, type DemoRow } from "@/lib/demo-data";
import { recordWaterReadingFormAction, reviewWaterReadingAction } from "@/app/actions";
import { calculateWaterCharge, evaluateReading } from "@/lib/domain/water";
import { formatCurrency, formatNumber } from "@/lib/format";

const alertOptions = { customClass: { popup: "village-swal" } };

export function WaterReadings({ initialRows = demoRows, isDemo = true }: { initialRows?: DemoRow[]; isDemo?: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState<DemoRow[]>(initialRows);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DemoRow | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [reviewingId, setReviewingId] = useState("");
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();
  const counts = useMemo(() => ({ done: rows.filter((row) => row.status === "บันทึกแล้ว").length, review: rows.filter((row) => row.status === "รอตรวจ").length, pending: rows.filter((row) => row.status === "รออ่าน").length }), [rows]);
  const filtered = rows.filter((row) => `${row.houseNumber} ${row.name}`.toLowerCase().includes(query.toLowerCase()));

  function openReading(row: DemoRow) { setSelected(row); setError(""); formRef.current?.reset(); dialogRef.current?.showModal(); }

  async function saveReading(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!selected) return;
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const current = Number(values.reading);
    const previous = Number(selected.previous);
    if (!Number.isFinite(current) || current < 0) { setError("กรุณากรอกเลขมิเตอร์ที่ถูกต้อง"); return; }
    if (!isDemo) {
      const formData = new FormData();
      formData.set("meterId", String(selected.meterId ?? selected.id));
      formData.set("readingDate", String(values.date ?? ""));
      formData.set("readingValue", String(current));
      formData.set("note", String(values.note ?? ""));
      setSaving(true);
      try {
        const response = await recordWaterReadingFormAction(formData);
        if (!response.ok) { setError(response.message); return; }
        dialogRef.current?.close();
        router.refresh();
        await Swal.fire({ ...alertOptions, icon: "success", title: "บันทึกเลขมิเตอร์แล้ว", text: "ระบบจะพักค่าที่ผิดปกติไว้ตรวจสอบ และยังไม่ออกบิลจนกว่าจะยืนยัน", confirmButtonColor: "#008BF8" });
        return;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "บันทึกเลขมิเตอร์ไม่สำเร็จ กรุณาลองอีกครั้ง");
      } finally {
        setSaving(false);
      }
    }
    const result = evaluateReading(previous, current, 50);
    if (result.requiresReview) {
      setRows((currentRows) => currentRows.map((row) => row.id === selected.id ? { ...row, current, usage: result.usage ?? "—", status: "รอตรวจ" } : row));
      dialogRef.current?.close();
      await Swal.fire({ ...alertOptions, icon: "warning", title: "รายการถูกพักไว้ตรวจสอบ", text: result.reason === "decrease" ? "เลขมิเตอร์ต่ำกว่ารอบก่อน ระบบยังไม่ออกบิล กรุณาตรวจมิเตอร์หรือบันทึกเหตุผล" : "ปริมาณใช้น้ำสูงกว่าค่าที่กำหนด ระบบยังไม่ออกบิล กรุณาตรวจสอบก่อน" });
      return;
    }
    setRows((currentRows) => currentRows.map((row) => row.id === selected.id ? { ...row, current, usage: result.usage ?? "—", status: "บันทึกแล้ว" } : row));
    dialogRef.current?.close();
    const amount = calculateWaterCharge(result.usage ?? 0, { mode: "flat", ratePerCubicMeter: 8.5, serviceFee: 20 });
    await Swal.fire({ ...alertOptions, toast: true, position: "top-end", icon: "success", title: `บันทึกแล้ว · ประมาณ ${formatCurrency(amount)}`, showConfirmButton: false, timer: 2500 });
  }

  async function confirmReview(row: DemoRow) {
    const result = await Swal.fire({ ...alertOptions, title: "ยืนยันผลตรวจมิเตอร์", text: `บ้านเลขที่ ${row.houseNumber} · เลขที่อ่าน ${row.current}`, input: "textarea", inputLabel: "เหตุผลการตรวจสอบ", inputPlaceholder: "เช่น ตรวจหน้ามิเตอร์ซ้ำกับเจ้าของบ้านแล้ว", inputValidator: (value) => value.trim().length < 3 ? "ระบุเหตุผลอย่างน้อย 3 ตัวอักษร" : undefined, icon: "question", showCancelButton: true, confirmButtonText: "ยืนยันเลข", cancelButtonText: "กลับไปตรวจ" });
    if (!result.isConfirmed) return;
    if (!isDemo) {
      const formData = new FormData(); formData.set("readingId", String(row.readingId ?? "")); formData.set("approved", "true"); formData.set("reason", String(result.value));
      if (reviewingId) return;
      setReviewingId(String(row.id));
      try {
        const response = await reviewWaterReadingAction(formData);
        if (!response.ok) { await Swal.fire({ ...alertOptions, icon: "error", title: "ตรวจสอบไม่สำเร็จ", text: response.message }); return; }
        router.refresh();
        await Swal.fire({ ...alertOptions, toast: true, position: "top-end", icon: "success", title: response.message, showConfirmButton: false, timer: 2000 });
        return;
      } catch (cause) {
        await Swal.fire({ ...alertOptions, icon: "error", title: "ตรวจสอบไม่สำเร็จ", text: cause instanceof Error ? cause.message : "กรุณาลองอีกครั้ง" });
      } finally {
        setReviewingId("");
      }
    }
    setRows((currentRows) => currentRows.map((item) => item.id === row.id ? { ...item, status: "บันทึกแล้ว" } : item));
    await Swal.fire({ ...alertOptions, toast: true, position: "top-end", icon: "success", title: "ยืนยันเลขมิเตอร์แล้ว", showConfirmButton: false, timer: 2000 });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-[24px] font-bold tracking-[-0.03em] text-slate-900 sm:text-[28px]">รอบอ่านมิเตอร์</h1><p className="mt-1 text-[13px] text-slate-500">รอบเดือนตุลาคม 2569 · ครบกำหนด 4 พฤศจิกายน</p></div><button onClick={() => Swal.fire({ ...alertOptions, title: "สร้างรอบอ่านมิเตอร์", text: "สร้างรอบใหม่สำหรับเดือนถัดไปหรือไม่?", icon: "question", showCancelButton: true, confirmButtonText: "สร้างรอบ", cancelButtonText: "ยกเลิก" })} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-[12px] font-semibold text-white hover:bg-[var(--primary-hover)]"><Plus size={16} />สร้างรอบใหม่</button></div>

      <div className="grid grid-cols-3 divide-x divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-white px-2 py-4 sm:px-5"><div className="px-3 sm:px-4"><p className="text-[10px] text-slate-500 sm:text-[11px]">บันทึกแล้ว</p><p className="mt-1.5 text-[21px] font-bold text-slate-900">{counts.done}<span className="ml-1 text-[11px] font-medium text-slate-400">มิเตอร์</span></p></div><div className="px-3 sm:px-5"><p className="text-[10px] text-slate-500 sm:text-[11px]">รอตรวจสอบ</p><p className="mt-1.5 flex items-center gap-1.5 text-[21px] font-bold text-amber-700">{counts.review}<TriangleAlert size={15} /></p></div><div className="px-3 sm:px-5"><p className="text-[10px] text-slate-500 sm:text-[11px]">รออ่าน</p><p className="mt-1.5 text-[21px] font-bold text-slate-900">{counts.pending}<span className="ml-1 text-[11px] font-medium text-slate-400">มิเตอร์</span></p></div></div>

      <div className="rounded-2xl border border-[var(--border)] bg-white">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h2 className="text-[14px] font-bold text-slate-900">รายการผู้ใช้น้ำ</h2><p className="mt-0.5 text-[11px] text-slate-500">ตรวจสอบเลขก่อนหน้าและบันทึกค่ารอบปัจจุบัน</p></div><label className="relative w-full sm:max-w-[300px]"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label="ค้นหาบ้านเลขที่หรือชื่อ" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาบ้านเลขที่หรือชื่อ..." className="h-9 w-full rounded-lg border border-[var(--border)] pl-9 pr-3 text-[11px] outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100" /></label></div>
        <div className="hidden overflow-x-auto md:block"><table className="w-full text-left"><thead className="bg-slate-50/80"><tr>{["บ้านเลขที่", "ผู้ใช้น้ำ", "รอบก่อน (ม³)", "รอบนี้ (ม³)", "หน่วยใช้", "สถานะ", ""].map((header) => <th key={header} className="h-11 whitespace-nowrap border-b border-[var(--border)] px-4 text-[10px] font-semibold text-slate-500 first:pl-5">{header}</th>)}</tr></thead><tbody>{filtered.map((row) => <tr key={String(row.id)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"><td className="h-[58px] px-4 pl-5 text-[12px] font-semibold text-slate-800">{row.houseNumber}</td><td className="px-4 text-[11px] text-slate-700">{row.name}</td><td className="px-4 text-[11px] tabular-nums text-slate-600">{formatNumber(Number(row.previous))}</td><td className="px-4 text-[11px] tabular-nums text-slate-600">{typeof row.current === "number" ? formatNumber(row.current) : "—"}</td><td className="px-4 text-[11px] tabular-nums text-slate-600">{typeof row.usage === "number" ? `${formatNumber(row.usage)} ม³` : "—"}</td><td className="px-4">{row.status === "รอตรวจ" ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">รอตรวจสอบ</span> : row.status === "บันทึกแล้ว" ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">บันทึกแล้ว</span> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">รออ่าน</span>}</td><td className="px-4 text-right">{row.status === "รอตรวจ" ? <button disabled={Boolean(reviewingId)} onClick={() => confirmReview(row)} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1.5 text-[10px] font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-60">{reviewingId === row.id && <LoaderCircle size={12} className="animate-spin" />}{reviewingId === row.id ? "กำลังตรวจ..." : "ตรวจสอบ"}</button> : <button disabled={saving} onClick={() => openReading(row)} className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">{row.status === "รออ่าน" ? "บันทึกเลข" : "แก้ไข"}</button>}</td></tr>)}</tbody></table></div>
        <div className="divide-y divide-slate-100 md:hidden">{filtered.map((row) => <article key={String(row.id)} className="space-y-3 px-4 py-3.5"><div className="flex items-center justify-between"><div><p className="text-[12px] font-semibold text-slate-800">บ้านเลขที่ {row.houseNumber}</p><p className="mt-0.5 text-[10px] text-slate-500">{row.name}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{row.status}</span></div><div className="flex items-center justify-between"><p className="text-[10px] text-slate-500">รอบก่อน {row.previous} · รอบนี้ {row.current} · ใช้ {row.usage} ม³</p>{row.status === "รอตรวจ" ? <button disabled={Boolean(reviewingId)} onClick={() => confirmReview(row)} className="text-[10px] font-semibold text-amber-800 disabled:opacity-50">{reviewingId === row.id ? "กำลังตรวจ..." : "ตรวจสอบ"}</button> : <button disabled={saving} onClick={() => openReading(row)} className="text-[10px] font-semibold text-[#0075d1] disabled:opacity-50">บันทึกเลข</button>}</div></article>)}</div>
        {filtered.length === 0 && <p className="py-12 text-center text-[12px] text-slate-500">ไม่พบรายการ</p>}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-4 py-3 text-[10px] text-slate-500 sm:px-5"><span>แสดง {filtered.length} จาก 842 มิเตอร์</span><span className="inline-flex items-center gap-1.5"><ClipboardCheck size={13} />บันทึกอัตโนมัติเมื่อยืนยัน</span></div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3"><Droplets size={16} className="mt-0.5 shrink-0 text-blue-600" /><p className="text-[11px] leading-5 text-blue-900">อัตราตัวอย่างในโหมดสาธิต: 8.50 บาท/ม³ + ค่าบริการ 20 บาท ระบบจริงจะใช้ชุดอัตราที่ผู้ดูแลตั้งค่าและบันทึกสำเนาไว้กับใบแจ้งหนี้</p></div>

      <dialog ref={dialogRef} aria-labelledby={dialogTitleId} aria-describedby={dialogDescriptionId} className="m-auto w-[calc(100%-28px)] max-w-[440px] rounded-2xl border border-[var(--border)] bg-white p-0 text-slate-900 shadow-[0_24px_70px_rgb(19_42_71_/_18%)] backdrop:bg-slate-950/35"><form ref={formRef} onSubmit={saveReading} className="space-y-5 p-5 sm:p-6"><div><h2 id={dialogTitleId} className="text-[18px] font-bold">บันทึกเลขมิเตอร์</h2><p id={dialogDescriptionId} className="mt-1 text-[12px] text-slate-500">บ้านเลขที่ {selected?.houseNumber} · {selected?.name}</p></div><label className="block space-y-1.5"><span className="text-[11px] font-semibold">เลขรอบก่อน</span><span className="block rounded-lg bg-slate-50 px-3 py-2.5 text-[12px] tabular-nums text-slate-600">{selected?.previous} ม³</span></label><label className="block space-y-1.5"><span className="text-[11px] font-semibold">เลขมิเตอร์รอบนี้ <span className="text-rose-500">*</span></span><input name="reading" type="number" min="0" step="0.01" inputMode="decimal" autoFocus required disabled={saving} className="h-11 w-full rounded-lg border border-[var(--border)] px-3 text-[14px] outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100" placeholder="กรอกตัวเลขบนมิเตอร์" /></label><label className="block space-y-1.5"><span className="text-[11px] font-semibold">วันที่อ่านมิเตอร์</span><input name="date" type="date" defaultValue="2026-10-29" disabled={saving} className="h-10 w-full rounded-lg border border-[var(--border)] px-3 text-[12px] outline-none focus:border-blue-400" /></label>{error && <p role="alert" className="text-[11px] text-rose-700">{error}</p>}<div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4"><button type="button" disabled={saving} onClick={() => dialogRef.current?.close()} className="h-9 rounded-lg border border-[var(--border)] px-3.5 text-[11px] font-semibold text-slate-600 disabled:opacity-50">ยกเลิก</button><button type="submit" disabled={saving} aria-busy={saving} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-[11px] font-semibold text-white disabled:opacity-70">{saving ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}{saving ? "กำลังบันทึก..." : "บันทึกเลข"}</button></div></form></dialog>
    </div>
  );
}
