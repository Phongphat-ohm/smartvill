"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useState } from "react";
import { findResidentByNationalIdAction } from "@/app/actions";

export function NationalIdSearch({ enabled }: { enabled: boolean }) {
  const [value, setValue] = useState(""); const [message, setMessage] = useState(""); const [result, setResult] = useState<{ id: string; name: string; household: string } | null>(null);
  if (!enabled) return null;
  async function submit(event: React.FormEvent) { event.preventDefault(); const response = await findResidentByNationalIdAction(value); setMessage(response.message ?? "พบข้อมูลประชากร"); setResult(response.resident ?? null); }
  return <section className="rounded-2xl border border-[var(--border)] bg-white p-4"><form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-end"><label className="flex-1"><span className="text-xs font-semibold text-slate-700">ค้นหาด้วยเลขบัตรประชาชน</span><input value={value} onChange={(event) => setValue(event.target.value.replace(/\D/g, "").slice(0, 13))} inputMode="numeric" placeholder="13 หลัก · ใช้ได้เฉพาะผู้มีสิทธิ์" className="mt-1.5 h-10 w-full rounded-lg border border-[var(--border)] px-3 text-sm" /></label><button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Search size={15} />ค้นหา</button></form>{message && <p role="status" className="mt-3 text-xs text-slate-600">{message}</p>}{result && <Link href={`/people/${result.id}`} className="mt-3 block rounded-lg bg-[var(--primary-soft)] px-3 py-2.5 text-sm font-semibold text-[#0075d1] hover:underline">{result.name}<span className="ml-2 text-xs font-normal text-slate-600">{result.household}</span></Link>}</section>;
}
