import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { getAuthenticatedProfile, hasPermission, logDataError } from "@/lib/data-access";
import { prisma } from "@/lib/prisma";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const configured = isSupabaseConfigured();
  let userName: string | null = null;
  let userRole: string | null = null;
  let villageName = "ตั้งค่าหมู่บ้าน";
  if (configured) {
    let profile: Awaited<ReturnType<typeof getAuthenticatedProfile>>;
    let settings: { name: string } | null;
    try {
      [profile, settings] = await Promise.all([
        getAuthenticatedProfile(),
        prisma.villageSettings.findUnique({ where: { id: 1 }, select: { name: true } }),
      ]);
    } catch (error) {
      const requestId = await logDataError("workspace.layout", error);
      throw new Error(`โหลดข้อมูลบัญชีไม่สำเร็จ (รหัสอ้างอิง ${requestId})`);
    }
    if (!profile) redirect("/login?reason=inactive");
    if (!(await hasPermission("dashboard.view", profile))) redirect("/no-access");
    userName = profile.displayName || profile.email;
    userRole = ({ system_admin: "ผู้ดูแลระบบ", village_head: "ผู้ใหญ่บ้าน", registry: "งานทะเบียน", water_operator: "งานประปา", finance_operator: "การเงินและกองทุน", shop_operator: "ร้านค้า", auditor: "ผู้ตรวจสอบ" } as Record<string, string>)[profile.roleId] ?? "เจ้าหน้าที่";
    villageName = settings?.name || "หมู่บ้าน";
  }
  if (!configured && process.env.NODE_ENV === "production") redirect("/setup");
  return <AppShell isDemo={!configured} userName={userName} userRole={userRole} villageName={villageName}>{children}</AppShell>;
}
