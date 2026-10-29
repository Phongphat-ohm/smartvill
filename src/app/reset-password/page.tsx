"use client";

import Link from "next/link";
import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { updatePasswordAction } from "@/app/actions";

const initialState = { ok: false, message: "" };

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(updatePasswordAction, initialState);
  return <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8"><section className="w-full max-w-[420px] rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-8"><span className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><KeyRound size={19} /></span><h1 className="mt-4 text-[22px] font-bold text-slate-900">ตั้งรหัสผ่านใหม่</h1><p className="mt-1 text-[12px] text-slate-500">เลือกใช้รหัสผ่านที่คาดเดายากและไม่ซ้ำกับบริการอื่น</p>{state.message && <p role="status" className={`mt-4 rounded-lg px-3 py-2.5 text-[11px] ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{state.message}</p>}{state.ok ? <Link href="/login" className="mt-5 flex h-10 w-full items-center justify-center rounded-lg bg-[var(--primary)] text-[11px] font-semibold text-white">กลับเข้าสู่ระบบ</Link> : <form action={action} className="mt-5 space-y-4"><label className="block space-y-1.5"><span className="text-[11px] font-semibold">รหัสผ่านใหม่</span><input name="password" type="password" autoComplete="new-password" minLength={12} required className="h-11 w-full rounded-lg border border-[var(--border)] px-3 text-[12px] outline-none focus:border-blue-400" /></label><label className="block space-y-1.5"><span className="text-[11px] font-semibold">ยืนยันรหัสผ่านใหม่</span><input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={12} required className="h-11 w-full rounded-lg border border-[var(--border)] px-3 text-[12px] outline-none focus:border-blue-400" /></label><button disabled={pending} className="h-10 w-full rounded-lg bg-[var(--primary)] text-[11px] font-semibold text-white hover:bg-[var(--primary-hover)] disabled:bg-slate-300">{pending ? "กำลังบันทึก..." : "บันทึกรหัสผ่าน"}</button></form>}<p className="mt-5 text-center text-[10px] text-slate-400"><Link href="/login" className="font-semibold text-[#0075d1]">กลับเข้าสู่ระบบ</Link></p></section></main>;
}
