import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function NoAccessPage() {
  return <main className="flex min-h-screen items-center justify-center bg-[var(--background)] p-5"><section className="max-w-md rounded-2xl border border-[var(--border)] bg-white p-7 text-center"><span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><ShieldAlert size={22} /></span><h1 className="mt-4 text-lg font-bold text-slate-900">บัญชีนี้ยังไม่มีสิทธิ์เข้าระบบ</h1><p className="mt-2 text-sm leading-6 text-slate-500">ติดต่อผู้ดูแลระบบเพื่อกำหนดบทบาทและสิทธิ์การใช้งาน</p><Link href="/login" className="mt-5 inline-flex h-10 items-center rounded-lg bg-[var(--primary)] px-4 text-sm font-semibold text-white">กลับหน้าเข้าสู่ระบบ</Link></section></main>;
}
