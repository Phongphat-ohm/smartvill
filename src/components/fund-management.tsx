"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Plus, Search, X } from "lucide-react";
import Swal from "sweetalert2";
import { approveFundTransactionAction, createFundTransactionAction } from "@/app/actions";
import { formatCurrency, formatThaiDate } from "@/lib/format";

type Fund = { id: string; name: string; accounts: { id: string; name: string; fund_id: string }[] };
type Transaction = { id: string; transaction_no: string; fund_id: string; account_id: string; type: string; amount: number; description: string; status: string; created_by: string; created_at: string; fund?: { name: string } | null; account?: { name: string } | null };
const typeLabels: Record<string, string> = { deposit: "เงินฝาก", withdrawal: "เงินถอน", contribution: "เงินสมทบ", income: "รายรับ", expense: "รายจ่าย", adjustment: "ปรับปรุงยอด" };
const statusLabels: Record<string, string> = { pending: "รออนุมัติ", approved: "อนุมัติแล้ว", rejected: "ปฏิเสธ" };
const alertTheme = { customClass: { popup: "village-swal" }, confirmButtonColor: "#008BF8" };

export function FundManagement({ funds, transactions, userId, canCreate, canApprove, demo = false }: { funds: Fund[]; transactions: Transaction[]; userId: string; canCreate: boolean; canApprove: boolean; demo?: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedFund, setSelectedFund] = useState(funds[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [decidingId, setDecidingId] = useState("");
  const selectedAccounts = funds.find((fund) => fund.id === selectedFund)?.accounts ?? [];
  const rows = transactions.filter((row) => `${row.transaction_no} ${row.description} ${row.fund?.name ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const form = event.currentTarget;
    setSaving(true);
    try {
      const result = await createFundTransactionAction(new FormData(form));
      if (!result.ok) { await Swal.fire({ ...alertTheme, icon: "error", title: "บันทึกไม่สำเร็จ", text: result.message }); return; }
      form.reset();
      await Swal.fire({ ...alertTheme, icon: "success", title: "บันทึกรายการแล้ว", text: result.message });
      router.refresh();
    } catch (cause) {
      await Swal.fire({ ...alertTheme, icon: "error", title: "บันทึกไม่สำเร็จ", text: cause instanceof Error ? cause.message : "กรุณาลองอีกครั้ง" });
    } finally {
      setSaving(false);
    }
  }
  async function decide(row: Transaction, approved: boolean) {
    const dialog = await Swal.fire({ ...alertTheme, title: approved ? "อนุมัติรายการนี้?" : "ปฏิเสธรายการนี้?", input: "textarea", inputLabel: "เหตุผลประกอบ (อย่างน้อย 3 ตัวอักษร)", inputPlaceholder: "ระบุเหตุผลเพื่อเก็บไว้ในประวัติ", showCancelButton: true, confirmButtonText: approved ? "อนุมัติ" : "ปฏิเสธ", cancelButtonText: "กลับ", inputValidator: (value) => value.trim().length < 3 ? "กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร" : undefined });
    if (!dialog.isConfirmed) return;
    if (decidingId) return;
    setDecidingId(row.id);
    try {
      const result = await approveFundTransactionAction(row.id, approved, dialog.value);
      await Swal.fire({ ...alertTheme, icon: result.ok ? "success" : "error", title: result.ok ? "ดำเนินการแล้ว" : "ดำเนินการไม่สำเร็จ", text: result.message });
      if (result.ok) router.refresh();
    } catch (cause) {
      await Swal.fire({ ...alertTheme, icon: "error", title: "ดำเนินการไม่สำเร็จ", text: cause instanceof Error ? cause.message : "กรุณาลองอีกครั้ง" });
    } finally {
      setDecidingId("");
    }
  }
  return <div className="space-y-5">
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-slate-900">บันทึกธุรกรรมกองทุน</h2><p className="mt-1 text-sm text-slate-500">รายการใหม่จะเข้าคิวอนุมัติก่อนมีผล</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{funds.length} กองทุน</span></div>
      {demo ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">โหมดสาธิต: เชื่อมต่อ Supabase และกำหนดสิทธิ์ก่อนบันทึกรายการจริง</p> : canCreate ? funds.length && selectedAccounts.length ? <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <label className="text-xs font-medium text-slate-600">กองทุน<select name="fundId" value={selectedFund} onChange={(event) => setSelectedFund(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">เลือกกองทุน</option>{funds.map((fund) => <option key={fund.id} value={fund.id}>{fund.name}</option>)}</select></label>
        <label className="text-xs font-medium text-slate-600">บัญชี<select name="accountId" required className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">เลือกบัญชี</option>{selectedAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        <label className="text-xs font-medium text-slate-600">ประเภทรายการ<select name="type" className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">{Object.entries(typeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="text-xs font-medium text-slate-600">จำนวนเงิน<input name="amount" type="number" min="0.01" step="0.01" required className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="0.00" /></label>
        <label className="text-xs font-medium text-slate-600 sm:col-span-2">รายละเอียด<input name="description" minLength={3} required className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" placeholder="เช่น รับเงินสมทบประจำเดือน" /></label>
        <div className="flex items-end lg:col-span-6"><button disabled={saving} aria-busy={saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#008BF8] px-4 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-wait disabled:opacity-70">{saving ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}{saving ? "กำลังบันทึก..." : "บันทึกรายการ"}</button></div>
      </form> : <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">ยังไม่มีบัญชีกองทุนที่ใช้งานได้ กรุณาตั้งค่ากองทุนและบัญชีก่อน</p> : <p className="text-sm text-slate-500">บัญชีนี้ดูรายการได้ แต่ไม่มีสิทธิ์สร้างธุรกรรม</p>}
    </section>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-900">รายการธุรกรรม</h2><p className="mt-1 text-xs text-slate-500">แสดง {rows.length} รายการล่าสุด</p></div><label className="relative block sm:w-72"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm" placeholder="ค้นหาเลขรายการหรือรายละเอียด" /></label></div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["เลขที่ / วันที่", "กองทุนและบัญชี", "รายละเอียด", "ประเภท", "จำนวน", "สถานะ", "ดำเนินการ"].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id}><td className="px-4 py-3"><div className="font-medium text-slate-800">{row.transaction_no}</div><div className="mt-1 text-xs text-slate-500">{formatThaiDate(row.created_at)}</div></td><td className="px-4 py-3"><div>{row.fund?.name ?? "—"}</div><div className="mt-1 text-xs text-slate-500">{row.account?.name ?? "—"}</div></td><td className="max-w-52 px-4 py-3 text-slate-700">{row.description}</td><td className="px-4 py-3">{typeLabels[row.type] ?? row.type}</td><td className="whitespace-nowrap px-4 py-3 font-medium">{formatCurrency(Number(row.amount))}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs ${row.status === "approved" ? "bg-emerald-50 text-emerald-700" : row.status === "rejected" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{statusLabels[row.status] ?? row.status}</span></td><td className="px-4 py-3">{canApprove && row.status === "pending" && row.created_by !== userId && <div className="flex gap-2"><button disabled={Boolean(decidingId)} aria-label="อนุมัติ" onClick={() => decide(row, true)} className="rounded-md p-2 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">{decidingId === row.id ? <LoaderCircle size={16} className="animate-spin" /> : <Check size={16} />}</button><button disabled={Boolean(decidingId)} aria-label="ปฏิเสธ" onClick={() => decide(row, false)} className="rounded-md p-2 text-rose-700 hover:bg-rose-50 disabled:opacity-50"><X size={16} /></button></div>}</td></tr>)}</tbody></table></div>
      <div className="divide-y divide-slate-100 md:hidden">{rows.map((row) => <article key={row.id} className="space-y-2 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-medium text-slate-900">{row.transaction_no}</p><p className="mt-0.5 text-xs text-slate-500">{formatThaiDate(row.created_at)} · {row.fund?.name ?? "กองทุน"}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{statusLabels[row.status] ?? row.status}</span></div><p className="text-sm text-slate-700">{row.description}</p><div className="flex items-center justify-between text-sm"><span className="text-slate-500">{typeLabels[row.type] ?? row.type} · {row.account?.name ?? "—"}</span><strong>{formatCurrency(Number(row.amount))}</strong></div>{canApprove && row.status === "pending" && row.created_by !== userId && <div className="flex gap-2 pt-1"><button disabled={Boolean(decidingId)} onClick={() => decide(row, true)} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 disabled:opacity-50">{decidingId === row.id ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}{decidingId === row.id ? "กำลังบันทึก..." : "อนุมัติ"}</button><button disabled={Boolean(decidingId)} onClick={() => decide(row, false)} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800 disabled:opacity-50"><X size={14} /> ปฏิเสธ</button></div>}</article>)}</div>
      {rows.length === 0 && <p className="p-8 text-center text-sm text-slate-500">ไม่พบธุรกรรม</p>}
    </section>
  </div>;
}
