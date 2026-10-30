import Link from "next/link";
import { UserPlus, ShieldCheck } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { InvitePanel } from "@/components/invite-panel";
import { currentUserWithPermission, logDataError } from "@/lib/data-access";
import { prisma } from "@/lib/prisma";

const roleLabels: Record<string, string> = { admin: "ผู้ดูแลระบบ", village_head: "ผู้ใหญ่บ้าน", registry: "งานทะเบียน", water_operator: "งานประปา", finance: "การเงินและกองทุน", shop_operator: "ผู้ปฏิบัติงานร้านค้า", auditor: "ผู้ตรวจสอบ" };

export default async function UsersPage() {
  const configured = isSupabaseConfigured();
  let profiles: Array<{ id: string; display_name: string; username: string; is_active: boolean; role_id: string }> = [];
  let roles: Array<{ id: string; name: string }> = [];
  if (configured) {
    const { allowed } = await currentUserWithPermission("users.manage");
    if (!allowed) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">บัญชีนี้ไม่มีสิทธิ์จัดการผู้ใช้</div>;
    try {
      const [profileData, roleData] = await Promise.all([
        prisma.profile.findMany({ select: { id: true, displayName: true, username: true, isActive: true, roleId: true }, orderBy: { displayName: "asc" } }),
        prisma.role.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
      ]);
      profiles = profileData.map(({ id, displayName, username, isActive, roleId }) => ({ id, display_name: displayName, username, is_active: isActive, role_id: roleId }));
      roles = roleData;
    } catch (error) {
      const requestId = await logDataError("settings.users.load", error);
      return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">โหลดข้อมูลผู้ใช้ไม่สำเร็จ รหัสอ้างอิง {requestId}</div>;
    }
  }
  return <div className="space-y-6"><div><h1 className="text-[24px] font-bold tracking-[-0.03em] text-slate-900 sm:text-[28px]">ผู้ใช้และสิทธิ์</h1><p className="mt-1 text-[13px] text-slate-500">สร้างคำเชิญเจ้าหน้าที่และตรวจสอบบทบาทบัญชี</p></div><InvitePanel roles={roles} enabled={configured} /><section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white"><div className="flex items-center gap-3 border-b border-[var(--border)] p-5"><ShieldCheck className="text-[#008BF8]" size={18} /><div><h2 className="text-[14px] font-semibold">บัญชีเจ้าหน้าที่</h2><p className="mt-1 text-[11px] text-slate-500">{configured ? `${profiles.length} บัญชี` : "เชื่อม Supabase เพื่อจัดการบัญชีจริง"}</p></div></div>{configured && profiles.length ? <div className="divide-y divide-slate-100">{profiles.map((profile) => <div key={profile.id} className="flex items-center justify-between gap-3 px-5 py-3.5"><div><p className="text-[12px] font-semibold text-slate-800">{profile.display_name}</p><p className="mt-0.5 text-[11px] text-slate-500">@{profile.username} · {roleLabels[profile.role_id] ?? profile.role_id}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${profile.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{profile.is_active ? "ใช้งาน" : "ปิดใช้งาน"}</span></div>)}</div> : <p className="p-8 text-center text-[12px] text-slate-500">ยังไม่มีบัญชีเจ้าหน้าที่</p>}</section><Link href="/settings" className="inline-flex items-center gap-2 text-[12px] font-medium text-[#0075d1]"><UserPlus size={15} /> ตั้งค่าหมู่บ้านและระบบ</Link></div>;
}
