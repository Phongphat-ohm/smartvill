import { notFound } from "next/navigation";
import { HouseholdDetail } from "@/components/registry-detail";
import { currentUserWithPermission, hasPermission, logDataError } from "@/lib/data-access";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function HouseholdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) return <div className="rounded-xl border border-sky-100 bg-sky-50 p-5 text-sm text-sky-900">หน้ารายละเอียดทะเบียนใช้ได้เมื่อเชื่อมต่อระบบ</div>;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  let canEdit = false;
  try {
    const { profile, allowed: canView } = await currentUserWithPermission("registry.household.view");
    if (!canView || !profile) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">บัญชีนี้ไม่มีสิทธิ์ดูครัวเรือน</p>;
    canEdit = await hasPermission("registry.household.update", profile);
  } catch (error) {
    const requestId = await logDataError("households.detail.authorization", error);
    return <div role="alert" className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><p>ตรวจสอบสิทธิ์หรือโหลดข้อมูลครัวเรือนไม่สำเร็จ</p><p>รหัสอ้างอิงสำหรับแจ้งผู้ดูแล: <code>{requestId}</code></p></div>;
  }
  try {
    const household = await prisma.household.findUnique({
      where: { id },
      select: {
        id: true, houseNumber: true, moo: true, road: true, subdistrict: true, district: true,
        province: true, postalCode: true, householdType: true, occupancyStatus: true, note: true,
        memberships: {
          where: { moveOutAt: null },
          select: { relationship: true, moveInAt: true, isHead: true, resident: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: [{ isHead: "desc" }, { moveInAt: "asc" }],
        },
        headHistory: {
          select: { id: true, startedAt: true, endedAt: true, reason: true, resident: { select: { firstName: true, lastName: true } }, actor: { select: { displayName: true } } },
          orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
        },
      },
    });
    if (!household) notFound();
    const members = household.memberships.map((item) => ({ id: item.resident.id, name: `${item.resident.firstName} ${item.resident.lastName}`.trim(), relationship: item.isHead ? "หัวหน้าครัวเรือน" : item.relationship === "หัวหน้าครัวเรือน" ? "สมาชิก" : item.relationship, isHead: item.isHead, moveInAt: item.moveInAt.toISOString().slice(0, 10), moveOutAt: null, moveReason: null }));
    const headHistory = household.headHistory.map((item) => ({ id: item.id, name: `${item.resident.firstName} ${item.resident.lastName}`, startedAt: item.startedAt.toISOString().slice(0, 10), endedAt: item.endedAt?.toISOString().slice(0, 10) ?? null, reason: item.reason, actor: item.actor?.displayName ?? "ข้อมูลตั้งต้น/ระบบ" }));
    return <HouseholdDetail household={{ id: household.id, houseNumber: household.houseNumber, moo: household.moo, road: household.road ?? "", subdistrict: household.subdistrict, district: household.district, province: household.province, postalCode: household.postalCode, type: household.householdType.toLowerCase(), status: household.occupancyStatus.toLowerCase(), note: household.note ?? "" }} members={members} headHistory={headHistory} canEdit={canEdit} />;
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_")) throw error;
    const requestId = await logDataError("households.detail.load", error);
    return <div role="alert" className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><p>โหลดข้อมูลครัวเรือนไม่สำเร็จ</p><p>รหัสอ้างอิงสำหรับแจ้งผู้ดูแล: <code>{requestId}</code></p></div>;
  }
}
