import { SettingsForm } from "@/components/settings-form";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { currentUserWithPermission, logDataError } from "@/lib/data-access";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const isDemo = !isSupabaseConfigured();
  let initial: { name: string; moo: string | null; subdistrict: string | null; district: string | null; province: string | null; postal_code: string | null; max_monthly_water_use: number } | null = null;
  if (!isDemo) {
    const { allowed } = await currentUserWithPermission("settings.manage");
    if (!allowed) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">บัญชีนี้ไม่มีสิทธิ์ปรับการตั้งค่าระบบ</div>;
    try {
      const data = await prisma.villageSettings.findUnique({ where: { id: 1 } });
      initial = data ? { name: data.name, moo: data.moo, subdistrict: data.subdistrict, district: data.district, province: data.province, postal_code: data.postalCode, max_monthly_water_use: Number(data.maxMonthlyWaterUse) } : null;
    } catch (error) {
      const requestId = await logDataError("settings.load", error);
      return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">โหลดการตั้งค่าไม่สำเร็จ รหัสอ้างอิง {requestId}</div>;
    }
  }
  return <div className="space-y-6"><div><h1 className="text-[24px] font-bold tracking-[-0.03em] text-slate-900 sm:text-[28px]">ตั้งค่าระบบ</h1><p className="mt-1 text-[13px] text-slate-500">ข้อมูลหมู่บ้าน รอบบิล และพารามิเตอร์ที่ใช้กับระบบประปา</p></div>{!initial && !isDemo && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">ยังไม่ได้ตั้งค่าหมู่บ้านในฐานข้อมูล ให้ผู้ดูแลเริ่มต้นและ seed ระบบก่อน</p>}<SettingsForm initial={initial} isDemo={isDemo} /></div>;
}
