"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOutAction } from "@/app/actions";
import {
  Activity, ChevronDown, CircleDollarSign, Droplets, House, KeyRound, LayoutDashboard,
  Menu, Package, ReceiptText, Settings2, ShieldCheck, ShoppingCart, Users, Wallet, X,
} from "lucide-react";

const navigation = [
  { label: "ภาพรวม", href: "/dashboard", icon: LayoutDashboard },
  { section: "ทะเบียน" },
  { label: "ครัวเรือน", href: "/households", icon: House },
  { label: "ประชากร", href: "/people", icon: Users },
  { section: "ประปาหมู่บ้าน" },
  { label: "อ่านมิเตอร์", href: "/water/readings", icon: Droplets },
  { label: "ใบแจ้งหนี้", href: "/water/billing", icon: ReceiptText },
  { section: "การเงินและกองทุน" },
  { label: "บัญชีกองทุน", href: "/finance/funds", icon: Wallet },
  { label: "สินเชื่อ", href: "/finance/loans", icon: CircleDollarSign },
  { section: "ร้านค้าหมู่บ้าน" },
  { label: "สินค้าและสต็อก", href: "/store", icon: Package },
  { label: "จุดขาย POS", href: "/store/pos", icon: ShoppingCart },
  { label: "ประวัติการขาย", href: "/store/sales", icon: ReceiptText },
  { section: "ระบบ" },
  { label: "รายงาน", href: "/reports", icon: Activity },
  { label: "ผู้ใช้และสิทธิ์", href: "/settings/users", icon: ShieldCheck },
  { label: "เปลี่ยนรหัสผ่าน", href: "/settings/password", icon: KeyRound },
  { label: "ตั้งค่าระบบ", href: "/settings", icon: Settings2 },
];

type AppShellProps = { children: React.ReactNode; isDemo: boolean; userName?: string | null; userRole?: string | null; villageName?: string };

export function AppShell({ children, isDemo, userName, userRole, villageName = "หมู่บ้านสมาร์ทวิลล์" }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const today = new Date();
  const fiscalYear = today.getFullYear() + 543 + (today.getMonth() >= 9 ? 1 : 0);
  const activeHref = navigation
    .filter((item): item is Extract<(typeof navigation)[number], { href: string }> => "href" in item)
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((left, right) => right.href.length - left.href.length)[0]?.href;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {mobileOpen && <button type="button" aria-label="ปิดเมนู" className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside id="mobile-navigation" aria-label="เมนูระบบ" className={`fixed inset-y-0 left-0 z-50 flex w-[252px] flex-col bg-[var(--surface)] transition-[transform,visibility] duration-200 lg:visible lg:pointer-events-auto lg:translate-x-0 ${mobileOpen ? "visible pointer-events-auto translate-x-0" : "invisible pointer-events-none -translate-x-full"}`}>
        <div className="flex h-[76px] items-center justify-between border-b border-[var(--border)] px-5">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <span className="flex size-10 items-center justify-center rounded-[13px] bg-[var(--primary)] text-white"><House size={20} strokeWidth={2.4} /></span>
            <span className="min-w-0"><span className="block text-[15px] font-bold tracking-[-0.02em] text-[var(--foreground)]">SmartVill</span><span className="block text-[11px] text-[var(--muted-foreground)]">ระบบบริหารจัดการหมู่บ้าน</span></span>
          </Link>
          <button type="button" aria-label="ปิดเมนู" className="flex size-11 items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:bg-slate-100 lg:hidden" onClick={() => setMobileOpen(false)}><X size={18} /></button>
        </div>
        <div className="border-b border-[var(--border)] px-4 py-4">
          <div className="flex items-center justify-between rounded-xl bg-[var(--surface-subtle)] px-3 py-2.5">
            <div className="min-w-0"><p className="line-clamp-2 text-[12px] font-semibold leading-5 text-[var(--foreground)]" title={villageName}>{villageName}</p><p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">ระบบบริหารจัดการ</p></div>
            <ChevronDown size={15} className="shrink-0 text-[var(--muted-foreground)]" />
          </div>
        </div>
        <nav aria-label="เมนูหลัก" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navigation.map((item) => "section" in item ? (
            <p key={item.section} className="px-3 pb-1 pt-5 text-[11px] font-bold tracking-[0.04em] text-slate-500">{item.section}</p>
          ) : (
            <Link key={item.href} href={item.href} aria-current={activeHref === item.href ? "page" : undefined} onClick={() => setMobileOpen(false)} className={`group flex h-10 items-center gap-3 rounded-[10px] px-3 text-[13px] font-medium transition-colors ${activeHref === item.href ? "bg-[var(--primary-soft)] text-[#0075d1]" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
              <item.icon size={17} strokeWidth={1.9} className="shrink-0" />{item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-[var(--border)] p-4">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#e1f1ff] text-[12px] font-bold text-[#006fc8]">{userName?.slice(0, 1) ?? "ส"}</div>
            <div className="min-w-0 flex-1"><p className="line-clamp-2 text-[12px] font-semibold leading-5" title={userName ?? "สมชาย ใจดี"}>{userName ?? "สมชาย ใจดี"}</p><p className="text-[11px] text-[var(--muted-foreground)]">{userRole ?? "ผู้ดูแลระบบ"}</p></div>
            {userName ? <form action={signOutAction}><button aria-label="ออกจากระบบ" title="ออกจากระบบ" className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><ChevronDown size={15} /></button></form> : <button aria-label="เมนูบัญชีผู้ใช้" className="rounded-md p-1 text-slate-400 hover:bg-slate-100"><ChevronDown size={15} /></button>}
          </div>
          {isDemo && <p className="mt-2 rounded-lg border border-sky-100 bg-sky-50 px-2.5 py-2 text-[11px] leading-4 text-sky-800">โหมดสาธิต · ข้อมูลในหน้าจอเป็นข้อมูลตัวอย่าง</p>}
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[252px]">
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-[var(--border)] bg-white/95 px-4 backdrop-blur-sm sm:px-7 lg:px-9">
          <div className="flex items-center gap-3">
            <button type="button" aria-label="เปิดเมนู" aria-controls="mobile-navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)} className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] text-slate-700 shadow-sm transition-colors hover:bg-slate-50 lg:hidden"><Menu size={21} strokeWidth={2.25} /></button>
            <div className="hidden items-center gap-2 text-[12px] text-slate-400 sm:flex"><span>{villageName}</span><span>/</span><span className="font-medium text-slate-600">ระบบจัดการ</span></div>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600 sm:hidden">ปีงบประมาณ {fiscalYear}</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden text-[12px] text-slate-500 md:block">{new Date().toLocaleDateString("th-TH", { dateStyle: "full", timeZone: "Asia/Bangkok" })}</span>
            <span className="hidden h-7 w-px bg-[var(--border)] sm:block" />
            <div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-full bg-[#e1f1ff] text-[11px] font-bold text-[#006fc8]">{userName?.slice(0, 1) ?? "ส"}</span><span className="hidden text-[12px] font-semibold sm:block">{userName ?? "สมชาย ใจดี"}</span></div>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-7 sm:py-8 lg:px-9">{children}</main>
      </div>
    </div>
  );
}
