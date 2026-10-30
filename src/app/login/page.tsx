"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, LockKeyhole, MapPinned } from "lucide-react";
import { loginAction } from "@/app/actions";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const initialState = { ok: false, message: "" };

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, initialState);
  const demo = !isSupabaseConfigured();
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1fr_0.9fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-[#eaf5ff] p-10 lg:flex lg:flex-col lg:justify-center xl:px-20">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-[13px] bg-[var(--primary)] text-white"><MapPinned size={20} /></span>
          <span>
            <strong className="block text-[17px]">SmartVill</strong>
            <span className="text-[13px] text-slate-600">ระบบบริหารจัดการหมู่บ้าน</span>
          </span>
        </Link>
        <div className="mt-16 max-w-[540px] xl:mt-24">
          <h1 className="text-[40px] font-bold leading-[1.3] tracking-[-0.03em] text-slate-900">งานหมู่บ้าน<br />เป็นระบบในที่เดียว</h1>
          <p className="mt-5 max-w-[440px] text-[16px] leading-8 text-slate-700">ดูแลทะเบียนครัวเรือน บริการประปา การเงิน กองทุน และร้านค้าชุมชน พร้อมประวัติการทำงานที่ตรวจสอบได้</p>
          <div className="mt-10 flex gap-10 border-t border-blue-200/80 pt-6">
            <div><p className="text-[22px] font-bold text-slate-900">1,000+</p><p className="mt-1 text-[13px] text-slate-600">ครัวเรือนที่รองรับ</p></div>
            <div><p className="text-[22px] font-bold text-slate-900">ครบทุกงาน</p><p className="mt-1 text-[13px] text-slate-600">ตั้งแต่ทะเบียนถึงการเงิน</p></div>
          </div>
        </div>
      </section>
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10 lg:px-12">
        <div className="w-full max-w-[420px]">
          <Link href="/dashboard" className="inline-flex min-h-10 items-center gap-2 text-[13px] font-medium text-slate-600 hover:text-slate-900 lg:hidden"><ArrowLeft size={16} />กลับหน้าระบบ</Link>
          <div className="mb-10 mt-6 flex items-center gap-3 lg:hidden"><span className="flex size-10 items-center justify-center rounded-[13px] bg-[var(--primary)] text-white"><MapPinned size={20} /></span><div><p className="text-[16px] font-bold">SmartVill</p><p className="text-[13px] text-slate-600">ระบบบริหารจัดการหมู่บ้าน</p></div></div>
          <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><LockKeyhole size={21} /></div>
          <h2 className="text-[30px] font-bold tracking-[-0.03em] text-slate-900">เข้าสู่ระบบ</h2>
          <p className="mt-2 text-[15px] leading-7 text-slate-600">ใช้บัญชีเจ้าหน้าที่เพื่อจัดการข้อมูลหมู่บ้าน</p>
          {demo && <div className="mt-6 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3.5 text-[14px] leading-6 text-sky-900">ยังไม่ได้ตั้งค่า Supabase<br />เข้าใช้งานหน้าจอตัวอย่างได้โดยไม่ต้องเข้าสู่ระบบ</div>}
          {state.message && <p role={state.ok ? "status" : "alert"} className={`mt-5 rounded-lg px-4 py-3 text-[14px] leading-6 ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{state.message}</p>}
          <form action={action} className="mt-8 space-y-5">
            <label className="block space-y-2"><span className="text-[14px] font-semibold text-slate-800">ชื่อผู้ใช้หรืออีเมล</span><input name="login" type="text" autoComplete="username" required className="h-12 w-full rounded-lg border border-[var(--border)] px-4 text-[15px] outline-none transition focus:border-blue-400 focus:ring-3 focus:ring-blue-100" placeholder="กรอกชื่อผู้ใช้หรืออีเมล" /></label>
            <label className="block space-y-2"><span className="text-[14px] font-semibold text-slate-800">รหัสผ่าน</span><input name="password" type="password" autoComplete="current-password" required className="h-12 w-full rounded-lg border border-[var(--border)] px-4 text-[15px] outline-none transition focus:border-blue-400 focus:ring-3 focus:ring-blue-100" placeholder="กรอกรหัสผ่าน" /></label>
            <div className="flex justify-end"><Link href="/forgot-password" className="inline-flex min-h-10 items-center text-[13px] font-medium text-[#0075d1] underline-offset-4 hover:underline">ลืมรหัสผ่าน?</Link></div>
            <button disabled={pending || demo} type="submit" className="h-12 w-full rounded-lg bg-[var(--primary)] text-[15px] font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:bg-slate-300">{pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
          </form>
          {demo && <Link href="/dashboard" className="mt-3 flex min-h-11 w-full items-center justify-center rounded-lg border border-[var(--border)] text-[14px] font-semibold text-slate-700 hover:bg-slate-50">เปิดโหมดสาธิต</Link>}
          <p className="mt-8 text-center text-[13px] leading-6 text-slate-600">เฉพาะเจ้าหน้าที่ที่ได้รับคำเชิญจากผู้ดูแลระบบ<br />การใช้งานถูกบันทึกเพื่อตรวจสอบความปลอดภัย</p>
        </div>
      </section>
    </main>
  );
}
