"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { resetPasswordAction } from "@/app/actions";

const initialState = { ok: false, message: "" };

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(resetPasswordAction, initialState);
  return <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8"><section className="w-full max-w-[420px] rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-8"><Link href="/login" className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500"><ArrowLeft size={14} />กลับเข้าสู่ระบบ</Link><span className="mt-7 flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Mail size={19} /></span><h1 className="mt-4 text-[22px] font-bold text-slate-900">กู้คืนรหัสผ่าน</h1><p className="mt-1 text-[12px] leading-5 text-slate-500">กรอกอีเมลที่ใช้สมัคร ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่</p>{state.message && <p role="status" className={`mt-4 rounded-lg px-3 py-2.5 text-[11px] ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{state.message}</p>}<form action={action} className="mt-5 space-y-4"><label className="block space-y-1.5"><span className="text-[11px] font-semibold">อีเมล</span><input name="email" type="email" autoComplete="email" required className="h-11 w-full rounded-lg border border-[var(--border)] px-3 text-[12px] outline-none focus:border-blue-400" placeholder="name@example.com" /></label><button disabled={pending} className="h-10 w-full rounded-lg bg-[var(--primary)] text-[11px] font-semibold text-white hover:bg-[var(--primary-hover)] disabled:bg-slate-300">{pending ? "กำลังส่ง..." : "ส่งลิงก์กู้บัญชี"}</button></form></section></main>;
}
