import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardCheck } from "lucide-react";
import { currentUserWithPermission, logDataError } from "@/lib/data-access";
import { prisma } from "@/lib/prisma";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type ReviewItem = { id: string; title: string; description: string; href: string };

function ReviewSection({ title, description, items }: { title: string; description: string; items: ReviewItem[] }) {
  return <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white"><div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4"><div><h2 className="text-sm font-bold text-slate-900">{title}</h2><p className="mt-1 text-xs text-slate-500">{description}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${items.length ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>{items.length}</span></div>{items.length ? <div className="divide-y divide-slate-100">{items.map((item) => <div key={item.id} className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center"><div><p className="text-sm font-semibold text-slate-800">{item.title}</p><p className="mt-1 text-xs text-slate-500">{item.description}</p></div><Link href={item.href} className="inline-flex h-9 items-center justify-center rounded-lg border border-blue-200 px-3 text-xs font-semibold text-[#0075d1] hover:bg-blue-50">ตรวจสอบและแก้ไข</Link></div>)}</div> : <div className="flex items-center gap-2 px-5 py-6 text-sm text-emerald-700"><CheckCircle2 size={18} />ไม่พบข้อมูลผิดเงื่อนไข</div>}</section>;
}

export default async function RegistryReviewPage() {
  if (!isSupabaseConfigured()) return <div className="space-y-5"><header className="flex items-start gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[#0075d1]"><ClipboardCheck size={21} /></span><div><h1 className="text-2xl font-bold tracking-[-0.03em] text-slate-900">ตรวจสอบข้อมูลทะเบียน</h1><p className="mt-1 text-sm text-slate-500">รายการเฝ้าระวังที่ควรตรวจสอบก่อนนำข้อมูลไปใช้งานจริง</p></div></header><div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm leading-6 text-sky-900">โหมดสาธิตยังไม่มีฐานข้อมูลทะเบียนให้ตรวจสอบ เมื่อเชื่อมต่อระบบแล้ว หน้านี้จะแสดงประชากรที่ไม่มีครัวเรือน ครัวเรือนที่ไม่มีเจ้าบ้าน สถานะครัวเรือนที่ไม่สอดคล้อง และข้อมูลผู้เสียชีวิตที่ไม่สมบูรณ์</div></div>;
  try {
    const { allowed } = await currentUserWithPermission("registry.household.view");
    if (!allowed) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">บัญชีนี้ไม่มีสิทธิ์ตรวจสอบข้อมูลทะเบียน</p>;
    const [unlinked, headless, occupiedEmpty, vacantWithMembers, deceasedIssues] = await Promise.all([
      prisma.resident.findMany({ where: { residencyStatus: { in: ["RESIDENT", "MOVED_IN"] }, memberships: { none: { moveOutAt: null } } }, select: { id: true, firstName: true, lastName: true, residencyStatus: true }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], take: 50 }),
      prisma.household.findMany({ where: { occupancyStatus: { not: "ARCHIVED" }, memberships: { some: { moveOutAt: null }, none: { moveOutAt: null, isHead: true } } }, select: { id: true, houseNumber: true, moo: true, _count: { select: { memberships: { where: { moveOutAt: null } } } } }, orderBy: { houseNumber: "asc" }, take: 50 }),
      prisma.household.findMany({ where: { occupancyStatus: "OCCUPIED", memberships: { none: { moveOutAt: null } } }, select: { id: true, houseNumber: true, moo: true }, orderBy: { houseNumber: "asc" }, take: 50 }),
      prisma.household.findMany({ where: { occupancyStatus: "VACANT", memberships: { some: { moveOutAt: null } } }, select: { id: true, houseNumber: true, moo: true }, orderBy: { houseNumber: "asc" }, take: 50 }),
      prisma.resident.findMany({ where: { OR: [{ residencyStatus: "DECEASED", deceasedAt: null }, { residencyStatus: "DECEASED", memberships: { some: { moveOutAt: null } } }] }, select: { id: true, firstName: true, lastName: true, deceasedAt: true, memberships: { where: { moveOutAt: null }, select: { id: true } } }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }], take: 50 }),
    ]);
    const sections = [
      { title: "ประชากรสถานะปัจจุบันที่ไม่มีสมาชิกครัวเรือน", description: "ควรย้ายเข้าครัวเรือนหรือแก้สถานะให้ตรงกับข้อเท็จจริง", items: unlinked.map((row) => ({ id: row.id, title: `${row.firstName} ${row.lastName}`, description: `สถานะ ${row.residencyStatus}`, href: `/people/${row.id}` })) },
      { title: "ครัวเรือนมีสมาชิกแต่ไม่มีเจ้าบ้าน", description: "แต่งตั้งเจ้าบ้านจากสมาชิกปัจจุบัน พร้อมวันที่มีผลและเหตุผล", items: headless.map((row) => ({ id: row.id, title: `บ้านเลขที่ ${row.houseNumber} หมู่ ${row.moo}`, description: `สมาชิกปัจจุบัน ${row._count.memberships} คน`, href: `/households/${row.id}` })) },
      { title: "สถานะครัวเรือนไม่สอดคล้องกับสมาชิก", description: "ตรวจสอบครัวเรือนที่ระบุว่ามีผู้อยู่อาศัยแต่ไม่มีสมาชิก หรือระบุว่าว่างแต่ยังมีสมาชิก", items: [...occupiedEmpty.map((row) => ({ id: `occupied-${row.id}`, title: `บ้านเลขที่ ${row.houseNumber} หมู่ ${row.moo}`, description: "สถานะมีผู้อยู่อาศัย แต่ไม่มีสมาชิกปัจจุบัน", href: `/households/${row.id}` })), ...vacantWithMembers.map((row) => ({ id: `vacant-${row.id}`, title: `บ้านเลขที่ ${row.houseNumber} หมู่ ${row.moo}`, description: "สถานะว่าง แต่ยังมีสมาชิกปัจจุบัน", href: `/households/${row.id}` }))] },
      { title: "ข้อมูลสถานะเสียชีวิตไม่สมบูรณ์", description: "สถานะเสียชีวิตต้องมีวันที่ และต้องไม่มีสมาชิกครัวเรือนที่ยัง active", items: deceasedIssues.map((row) => ({ id: row.id, title: `${row.firstName} ${row.lastName}`, description: `${row.deceasedAt ? "มีวันที่เสียชีวิต" : "ไม่มีวันที่เสียชีวิต"}${row.memberships.length ? " · ยังเป็นสมาชิกปัจจุบัน" : ""}`, href: `/people/${row.id}` })) },
    ];
    const total = sections.reduce((sum, section) => sum + section.items.length, 0);
    return <div className="space-y-5"><header className="flex items-start gap-3"><span className="flex size-11 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[#0075d1]"><ClipboardCheck size={21} /></span><div><h1 className="text-2xl font-bold tracking-[-0.03em] text-slate-900">ตรวจสอบข้อมูลทะเบียน</h1><p className="mt-1 text-sm text-slate-500">รายการเฝ้าระวังที่ควรตรวจสอบก่อนนำข้อมูลไปใช้งานจริง</p></div></header>{total > 0 && <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><p>พบ {total} รายการในผลลัพธ์ชุดแรก (แต่ละหัวข้อแสดงสูงสุด 50 รายการ) กรุณาเปิดตรวจสอบและแก้ไขจากข้อมูลจริง</p></div>}{sections.map((section) => <ReviewSection key={section.title} {...section} />)}</div>;
  } catch (error) {
    const requestId = await logDataError("registry.review.load", error);
    return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">โหลดรายการตรวจสอบไม่สำเร็จ รหัสอ้างอิง {requestId}</p>;
  }
}
