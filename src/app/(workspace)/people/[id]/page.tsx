import { notFound } from "next/navigation";
import { ResidentDetail } from "@/components/registry-detail";
import { currentUserWithPermission, hasPermission, logDataError } from "@/lib/data-access";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function ResidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) return <div className="rounded-xl border border-sky-100 bg-sky-50 p-5 text-sm text-sky-900">หน้ารายละเอียดทะเบียนใช้ได้เมื่อเชื่อมต่อระบบ</div>;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  let canEdit = false; let canSensitive = false;
  try {
    const { profile, allowed } = await currentUserWithPermission("registry.resident.view");
    if (!allowed || !profile) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">บัญชีนี้ไม่มีสิทธิ์ดูข้อมูลประชากร</p>;
    [canEdit, canSensitive] = await Promise.all([hasPermission("registry.resident.update", profile), hasPermission("registry.resident.sensitive.read", profile)]);
  } catch (error) {
    const requestId = await logDataError("people.detail.authorization", error);
    return <div role="alert" className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><p>ตรวจสอบสิทธิ์หรือโหลดข้อมูลประชากรไม่สำเร็จ</p><p>รหัสอ้างอิงสำหรับแจ้งผู้ดูแล: <code>{requestId}</code></p></div>;
  }
  try {
    const resident = await prisma.resident.findUnique({
        where: { id },
        select: {
          id: true, firstName: true, lastName: true, birthDate: true, phone: true,
          residencyStatus: true, nationalIdCiphertext: true, deceasedAt: true, deathReason: true,
          memberships: {
            select: {
              relationship: true, isHead: true, moveInAt: true, moveOutAt: true, moveReason: true,
              household: { select: { id: true, houseNumber: true, moo: true } },
            },
            orderBy: { moveInAt: "desc" },
          },
        },
      });
    if (!resident) notFound();
    const history = resident.memberships.map((item) => ({
      householdId: item.household.id,
      householdLabel: `บ้านเลขที่ ${item.household.houseNumber} หมู่ ${item.household.moo}`,
      relationship: item.isHead ? "หัวหน้าครัวเรือน" : item.relationship === "หัวหน้าครัวเรือน" ? "สมาชิก" : item.relationship,
      isHead: item.isHead,
      moveInAt: item.moveInAt.toISOString().slice(0, 10),
      moveOutAt: item.moveOutAt?.toISOString().slice(0, 10) ?? null,
      moveReason: item.moveReason,
    }));
    return <ResidentDetail resident={{ id: resident.id, firstName: resident.firstName, lastName: resident.lastName, birthDate: resident.birthDate?.toISOString().slice(0, 10) ?? "", phone: resident.phone ?? "", status: resident.residencyStatus.toLowerCase(), hasNationalId: Boolean(resident.nationalIdCiphertext), deceasedAt: resident.deceasedAt?.toISOString().slice(0, 10) ?? null, deathReason: resident.deathReason }} history={history} canEdit={canEdit} canSensitive={canSensitive} />;
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_")) throw error;
    const requestId = await logDataError("people.detail.load", error);
    return <div role="alert" className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"><p>โหลดข้อมูลประชากรไม่สำเร็จ</p><p>รหัสอ้างอิงสำหรับแจ้งผู้ดูแล: <code>{requestId}</code></p></div>;
  }
}
