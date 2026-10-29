"use client";

import Link from "next/link";
import { Activity, Droplet, House, ReceiptText, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCurrency, formatNumber } from "@/lib/format";

export type DashboardSnapshot = {
  households: number | null;
  residents: number | null;
  reviewReadings: number | null;
  unpaidInvoices: number | null;
  outstandingAmount: number | null;
  waterUsage: Array<{ month: string; use: number }>;
  errors: string[];
};

export function LiveDashboard({ data }: { data: DashboardSnapshot }) {
  const metrics = [
    { label: "ครัวเรือน", value: data.households === null ? "—" : formatNumber(data.households), icon: House },
    { label: "ประชากร", value: data.residents === null ? "—" : formatNumber(data.residents), icon: Users },
    { label: "รายการอ่านที่รอตรวจ", value: data.reviewReadings === null ? "—" : formatNumber(data.reviewReadings), icon: Droplet },
    { label: "ใบแจ้งหนี้ค้าง", value: data.unpaidInvoices === null ? "—" : formatNumber(data.unpaidInvoices), icon: ReceiptText },
  ];
  return <div className="space-y-6"><div><h1 className="text-[24px] font-bold tracking-[-0.03em] text-slate-900 sm:text-[28px]">ภาพรวมหมู่บ้าน</h1><p className="mt-1 text-[13px] text-slate-500">สรุปจากข้อมูลจริงตามสิทธิ์ของบัญชีที่เข้าสู่ระบบ</p></div>{data.errors.length > 0 && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">บางสถิติยังโหลดไม่ได้ ตรวจ migration และสิทธิ์ของโมดูลที่เกี่ยวข้อง</p>}<section className="grid grid-cols-2 gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 sm:grid-cols-4 sm:divide-x sm:divide-[var(--border)] sm:p-5">{metrics.map(({ label, value, icon: Icon }) => <div key={label} className="px-2 sm:px-4"><div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-[10px] bg-[var(--primary-soft)] text-[#0075d1]"><Icon size={16} /></span><span className="text-[11px] font-medium text-slate-500">{label}</span></div><p className="mt-3 text-[21px] font-bold text-slate-900 sm:text-[24px]">{value}</p></div>)}</section><section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]"><div className="rounded-2xl border border-[var(--border)] bg-white"><div className="px-5 py-4"><h2 className="text-[14px] font-bold text-slate-900">ปริมาณใช้น้ำรายเดือน</h2><p className="mt-1 text-[11px] text-slate-500">หน่วยรวมจากเลขอ่านที่ยืนยันแล้ว</p></div><div className="h-[250px] px-3 pb-4">{data.waterUsage.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={data.waterUsage} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}><defs><linearGradient id="liveUsage" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#008BF8" stopOpacity={0.2} /><stop offset="100%" stopColor="#008BF8" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#edf1f6" strokeDasharray="3 3" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8997a9" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8997a9" }} /><Tooltip formatter={(value) => [`${formatNumber(Number(value))} ม³`, "ปริมาณใช้"]} /><Area type="monotone" dataKey="use" stroke="#008BF8" strokeWidth={2.5} fill="url(#liveUsage)" /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-xs text-slate-400">ยังไม่มีข้อมูลอ่านมิเตอร์ที่ยืนยันแล้ว</div>}</div></div><div className="rounded-2xl border border-[var(--border)] bg-white p-5"><div className="flex items-center gap-2"><Activity className="text-[#008BF8]" size={17} /><h2 className="text-[14px] font-bold text-slate-900">สถานะงาน</h2></div><div className="mt-4 space-y-3">{data.reviewReadings !== null && <Link href="/water/readings" className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-3"><span className="text-xs font-medium text-amber-900">เลขมิเตอร์รอตรวจสอบ</span><b className="text-sm text-amber-900">{formatNumber(data.reviewReadings)}</b></Link>}{data.unpaidInvoices !== null && <Link href="/water/billing" className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3"><span className="text-xs font-medium text-slate-700">ใบแจ้งหนี้ค้างชำระ</span><b className="text-sm text-slate-900">{formatNumber(data.unpaidInvoices)}</b></Link>}{data.outstandingAmount !== null && <p className="px-1 text-xs text-slate-500">ยอดค้างรวม {formatCurrency(data.outstandingAmount)}</p>}{data.reviewReadings === null && data.unpaidInvoices === null && <p className="text-xs leading-5 text-slate-500">บทบาทนี้ไม่มีสิทธิ์ดูรายการประปาและการเงิน</p>}</div></div></section></div>;
}
