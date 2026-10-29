import { SettingsForm } from "@/components/settings-form";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const isDemo = !isSupabaseConfigured();
  let initial: { name: string; moo: string | null; subdistrict: string | null; district: string | null; province: string | null; postal_code: string | null; max_monthly_water_use: number } | null = null;
  if (!isDemo) {
    const supabase = await createServerSupabaseClient();
    const { data: allowed } = await supabase.rpc("has_permission", { permission_key: "settings.manage" });
    if (!allowed) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">บัญชีนี้ไม่มีสิทธิ์ปรับการตั้งค่าระบบ</div>;
    const { data } = await supabase.from("village_settings").select("name,moo,subdistrict,district,province,postal_code,max_monthly_water_use").eq("id", 1).maybeSingle();
    initial = data ? { ...data, max_monthly_water_use: Number(data.max_monthly_water_use) } : null;
  }
  return <div className="space-y-6"><div><h1 className="text-[24px] font-bold tracking-[-0.03em] text-slate-900 sm:text-[28px]">ตั้งค่าระบบ</h1><p className="mt-1 text-[13px] text-slate-500">ข้อมูลหมู่บ้าน รอบบิล และพารามิเตอร์ที่ใช้กับระบบประปา</p></div>{!initial && !isDemo && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">ยังไม่ได้ตั้งค่าหมู่บ้านในฐานข้อมูล ให้ผู้ดูแลเริ่มต้นและ seed ระบบก่อน</p>}<SettingsForm initial={initial} isDemo={isDemo} /></div>;
}
