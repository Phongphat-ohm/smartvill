"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/actions";

const initialState = { ok: false, message: "" };

export function PasswordChangeForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initialState);
  return <section className="max-w-2xl rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
    <div className="mb-5"><h2 className="text-base font-semibold text-slate-900">เปลี่ยนรหัสผ่าน</h2><p className="mt-1 text-sm leading-6 text-slate-500">ยืนยันรหัสผ่านปัจจุบันก่อนตั้งรหัสใหม่ ระบบจะออกจากระบบทุกอุปกรณ์เมื่อเปลี่ยนสำเร็จ</p></div>
    {state.message && <p role="status" className={`mb-4 rounded-lg px-3 py-2.5 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{state.message}</p>}
    <form action={action} className="space-y-4">
      <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">รหัสผ่านปัจจุบัน</span><input name="currentPassword" type="password" autoComplete="current-password" required className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100" /></label>
      <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">รหัสผ่านใหม่</span><input name="password" type="password" autoComplete="new-password" minLength={12} required className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100" /><span className="block text-xs text-slate-500">อย่างน้อย 12 ตัวอักษร</span></label>
      <label className="block space-y-1.5"><span className="text-sm font-medium text-slate-700">ยืนยันรหัสผ่านใหม่</span><input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={12} required className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100" /></label>
      <button disabled={pending} className="inline-flex h-10 items-center rounded-lg bg-[#008BF8] px-4 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-300">{pending ? "กำลังเปลี่ยนรหัสผ่าน..." : "เปลี่ยนรหัสผ่าน"}</button>
    </form>
  </section>;
}
