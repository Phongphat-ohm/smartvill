"use client";

import { useState } from "react";
import { Copy, UserPlus } from "lucide-react";
import { createStaffInvitationAction } from "@/app/actions";

type Role = { id: string; name: string };

export function InvitePanel({ roles, enabled }: { roles: Role[]; enabled: boolean }) {
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [result, setResult] = useState<{ ok: boolean; message: string; href?: string; code?: string } | null>(null);
  return <section className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6"><div className="flex items-start gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[#0075d1]"><UserPlus size={17} /></span><div><h2 className="text-[14px] font-semibold text-slate-800">เชิญเจ้าหน้าที่</h2><p className="mt-1 text-[11px] leading-5 text-slate-500">รหัสเชิญใช้ได้ครั้งเดียวและหมดอายุใน 72 ชั่วโมง ส่งลิงก์ให้เจ้าหน้าที่ผ่านช่องทางที่หมู่บ้านกำหนด</p></div></div><form action={async (formData) => { const response = await createStaffInvitationAction(formData); setResult({ ...response, message: response.message ?? (response.ok ? "สร้างคำเชิญแล้ว" : "สร้างคำเชิญไม่สำเร็จ") }); }} className="mt-4 flex flex-col gap-2 sm:flex-row"><select name="roleId" value={roleId} onChange={(event) => setRoleId(event.target.value)} required disabled={!enabled || roles.length === 0} className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-white px-3 text-[12px] outline-none focus:border-blue-400"><option value="">เลือกบทบาท</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select><button disabled={!enabled || roles.length === 0} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><UserPlus size={15} />สร้างคำเชิญ</button></form>{result && <div role="status" className={`mt-3 rounded-lg p-3 text-[11px] ${result.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{result.message}{result.href && <div className="mt-2 flex flex-wrap items-center gap-2"><code className="break-all rounded bg-white px-2 py-1">{result.href}</code><button type="button" onClick={() => void navigator.clipboard.writeText(result.href!)} className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-white px-2 py-1 font-semibold"><Copy size={13} />คัดลอกลิงก์</button></div>}</div>}</section>;
}
