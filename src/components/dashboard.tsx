"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, Check, Clock3, Droplet, House, Plus, Users, Wallet } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/format";

const usageData = [
  { month: "พ.ค.", use: 2480 }, { month: "มิ.ย.", use: 2560 }, { month: "ก.ค.", use: 2710 },
  { month: "ส.ค.", use: 2650 }, { month: "ก.ย.", use: 2830 }, { month: "ต.ค.", use: 2940 },
];

const recentActivity = [
  { name: "กมลวรรณ แสงดี", action: "บันทึกเลขมิเตอร์", detail: "บ้านเลขที่ 44/2", time: "10:42 น.", color: "blue" },
  { name: "สุชาติ แก้วใจ", action: "รับชำระค่าน้ำ", detail: "ใบเสร็จ WT-690104", time: "10:18 น.", color: "green" },
  { name: "วิไลพร ใจมั่น", action: "เพิ่มสมาชิกครัวเรือน", detail: "บ้านเลขที่ 118", time: "09:56 น.", color: "purple" },
  { name: "สมชาย ใจดี", action: "อนุมัติรายการ", detail: "เงินสมทบกองทุน 2,500 ฿", time: "09:21 น.", color: "amber" },
];

export function Dashboard() {
  const [period, setPeriod] = useState("6 เดือน");
  const metrics = [
    { label: "ครัวเรือนทั้งหมด", value: "842", helper: "+12 จากเดือนก่อน", trend: "up", icon: House, tint: "blue" },
    { label: "ประชากรในหมู่บ้าน", value: "2,416", helper: "+8 จากเดือนก่อน", trend: "up", icon: Users, tint: "violet" },
    { label: "ยอดใช้น้ำเดือนนี้", value: "2,940 ม³", helper: "+3.9% จากเดือนก่อน", trend: "up", icon: Droplet, tint: "cyan" },
    { label: "ยอดค้างชำระ", value: "฿ 28,450", helper: "18 ครัวเรือน", trend: "down", icon: Wallet, tint: "amber" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h1 className="text-[24px] font-bold tracking-[-0.03em] text-slate-900 sm:text-[28px]">ภาพรวมหมู่บ้าน</h1><p className="mt-1 text-[13px] text-slate-500">สรุปงานและสถานะบริการประจำวัน</p></div>
        <div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-[12px] text-slate-600"><CalendarDays size={15} className="text-slate-400" />29 ต.ค. 2569</span><Link href="/water/readings" className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--primary)] px-3.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[var(--primary-hover)]"><Plus size={15} />บันทึกมิเตอร์</Link></div>
      </div>

      <section aria-label="สถิติหมู่บ้าน" className="grid grid-cols-2 gap-x-4 gap-y-6 rounded-2xl border border-[var(--border)] bg-white p-4 sm:grid-cols-4 sm:gap-y-3 sm:divide-x sm:divide-[var(--border)] sm:p-5">
        {metrics.map(({ label, value, helper, trend, icon: Icon, tint }, index) => (
          <div key={label} className={`min-w-0 px-1 sm:px-4 ${index > 0 ? "sm:pl-5" : ""}`}>
            <div className="flex items-start gap-2"><span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[10px] ${tint === "blue" ? "bg-blue-50 text-blue-600" : tint === "violet" ? "bg-violet-50 text-violet-600" : tint === "cyan" ? "bg-cyan-50 text-cyan-700" : "bg-amber-50 text-amber-700"}`}><Icon size={16} /></span><span className="min-w-0 text-[12px] font-medium leading-4 text-slate-600">{label}</span></div>
            <p className="mt-3 text-[21px] font-bold leading-none tracking-[-0.03em] text-slate-900 sm:text-[24px]">{value}</p>
            <p className="mt-2 flex items-start gap-1 text-[11px] leading-4 text-slate-500">{trend === "up" ? <ArrowUpRight size={13} className="mt-0.5 shrink-0 text-emerald-600" /> : <ArrowDownRight size={13} className="mt-0.5 shrink-0 text-emerald-600" />}{helper}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
          <div className="flex flex-col justify-between gap-3 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:px-6">
            <div><h2 className="text-[15px] font-bold text-slate-900">รอบอ่านมิเตอร์เดือนตุลาคม</h2><p className="mt-0.5 text-[11px] text-slate-500">ความคืบหน้าการจดหน่วยและรายการที่ต้องตรวจสอบ</p></div>
            <Link href="/water/readings" className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0075d1] hover:underline">เปิดรอบอ่าน <ArrowRight size={14} /></Link>
          </div>
          <div className="grid gap-5 px-5 py-5 sm:grid-cols-[1fr_0.85fr] sm:px-6">
            <div>
              <div className="flex items-end justify-between"><div><p className="text-[34px] font-bold leading-none tracking-[-0.04em] text-slate-900">68<span className="ml-1 text-[18px] font-semibold text-slate-400">%</span></p><p className="mt-2 text-[12px] text-slate-500">อ่านแล้ว 573 จาก 842 มิเตอร์</p></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">เหลือ 6 วัน</span></div>
              <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: "68%" }} /></div>
              <div className="mt-3 flex justify-between text-[10px] text-slate-400"><span>เริ่ม 1 ต.ค.</span><span>ครบกำหนด 4 พ.ย. 2569</span></div>
              <div className="mt-5 flex flex-wrap gap-2"><span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-800"><Check size={13} />บันทึกแล้ว 573</span><span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] font-medium text-amber-800"><Clock3 size={13} />รอตรวจ 7</span></div>
            </div>
            <div className="rounded-xl bg-[#f7faff] p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[12px] font-semibold text-slate-800">รายการต้องตรวจ</p><p className="mt-0.5 text-[10px] text-slate-500">มีความผิดปกติหรือข้อมูลไม่ครบ</p></div><span className="flex size-7 items-center justify-center rounded-lg bg-amber-100 text-[11px] font-bold text-amber-800">7</span></div>
              <div className="mt-3 space-y-2.5">
                {[{ house: "บ้านเลขที่ 72/1", reason: "เลขมิเตอร์ต่ำกว่ารอบก่อน" }, { house: "บ้านเลขที่ 155", reason: "ใช้น้ำสูงกว่าค่าเฉลี่ย" }, { house: "บ้านเลขที่ 201/3", reason: "ยังไม่พบเลขมิเตอร์" }].map((item) => <div key={item.house} className="flex gap-2 border-t border-blue-100/80 pt-2.5 first:border-0 first:pt-0"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500" /><div className="min-w-0"><p className="text-[12px] font-semibold text-slate-700">{item.house}</p><p className="mt-0.5 text-[11px] leading-4 text-slate-500">{item.reason}</p></div></div>)}
              </div>
              <Link href="/water/readings?status=review" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0075d1] hover:underline">ตรวจรายการทั้งหมด <ArrowRight size={12} /></Link>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white">
          <div className="flex items-start justify-between px-5 py-4 sm:px-6"><div><h2 className="text-[15px] font-bold text-slate-900">ปริมาณใช้น้ำ</h2><p className="mt-0.5 text-[11px] text-slate-500">หน่วยรวมรายเดือน · ลูกบาศก์เมตร</p></div><select aria-label="ช่วงข้อมูล" value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-lg border border-[var(--border)] bg-white px-2.5 py-1.5 text-[11px] text-slate-600 outline-none focus:border-blue-400"><option>6 เดือน</option><option>12 เดือน</option></select></div>
          <div className="h-[205px] px-2 pb-3 sm:px-4"><ResponsiveContainer width="100%" height="100%"><AreaChart data={usageData} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}><defs><linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#008BF8" stopOpacity={0.18} /><stop offset="95%" stopColor="#008BF8" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#edf1f6" strokeDasharray="3 3" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8997a9" }} dy={9} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#8997a9" }} /><Tooltip formatter={(value) => [`${formatNumber(Number(value))} ม³`, "ปริมาณใช้"]} contentStyle={{ border: "1px solid #e4eaf2", borderRadius: 12, fontSize: 12, boxShadow: "0 8px 24px rgb(31 65 104 / 8%)" }} /><Area type="monotone" dataKey="use" stroke="#008BF8" strokeWidth={2.5} fill="url(#usageGradient)" activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} /></AreaChart></ResponsiveContainer></div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
        <div className="rounded-2xl border border-[var(--border)] bg-white">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6"><div><h2 className="text-[15px] font-bold text-slate-900">กิจกรรมล่าสุด</h2><p className="mt-0.5 text-[11px] text-slate-500">บันทึกการทำงานจากเจ้าหน้าที่</p></div><Link href="/reports" className="text-[11px] font-semibold text-[#0075d1] hover:underline">ดูทั้งหมด</Link></div>
          <div className="divide-y divide-slate-100 px-5 sm:px-6">{recentActivity.map((item) => <div key={item.name + item.time} className="flex items-start gap-3 py-3"><span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${item.color === "blue" ? "bg-blue-50 text-blue-700" : item.color === "green" ? "bg-emerald-50 text-emerald-700" : item.color === "purple" ? "bg-violet-50 text-violet-700" : "bg-amber-50 text-amber-800"}`}>{item.name.slice(0, 1)}</span><div className="min-w-0 flex-1"><p className="text-[12px] font-semibold leading-5 text-slate-800">{item.action}<span className="font-normal text-slate-500"> · {item.name}</span></p><p className="mt-0.5 text-[11px] leading-4 text-slate-500">{item.detail}</p></div><span className="shrink-0 pt-0.5 text-[11px] text-slate-400">{item.time}</span></div>)}</div>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-white">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6"><div><h2 className="text-[15px] font-bold text-slate-900">งานที่ต้องทำ</h2><p className="mt-0.5 text-[11px] text-slate-500">รายการรอดำเนินการของคุณ</p></div><span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">4 รายการ</span></div>
          <div className="space-y-1 p-3">
            {[{ title: "ตรวจเลขมิเตอร์ผิดปกติ", meta: "7 รายการ · ประปา", href: "/water/readings", tone: "amber" }, { title: "อนุมัติรายการกองทุน", meta: "3 รายการ · การเงิน", href: "/finance/funds", tone: "blue" }, { title: "ชำระค่าน้ำค้าง", meta: "18 ครัวเรือน · ประปา", href: "/water/billing", tone: "rose" }, { title: "ตรวจสต็อกสินค้า", meta: "4 รายการใกล้หมด · ร้านค้า", href: "/store", tone: "violet" }].map((task) => <Link key={task.title} href={task.href} className="flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-50"><span className={`mt-1.5 size-2 shrink-0 rounded-full ${task.tone === "amber" ? "bg-amber-500" : task.tone === "blue" ? "bg-blue-500" : task.tone === "rose" ? "bg-rose-500" : "bg-violet-500"}`} /><span className="min-w-0 flex-1"><span className="block text-[12px] font-semibold leading-5 text-slate-800">{task.title}</span><span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{task.meta}</span></span><ArrowRight size={14} className="mt-1 shrink-0 text-slate-400" /></Link>)}
          </div>
        </div>
      </section>
    </div>
  );
}
