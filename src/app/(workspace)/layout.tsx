import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { isSupabaseConfigured, createServerSupabaseClient } from "@/lib/supabase/server";

export default async function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const configured = isSupabaseConfigured();
  let userName: string | null = null;
  let userRole: string | null = null;
  let villageName = "ตั้งค่าหมู่บ้าน";
  if (configured) {
    const supabase = await createServerSupabaseClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const claims = claimsData?.claims;
    const userId = claims?.sub;
    if (!userId) redirect("/login");
    const [{ data: profile }, { data: canView }, { data: settings }] = await Promise.all([
      supabase.from("profiles").select("is_active,display_name,role_id").eq("id", userId).maybeSingle(),
      supabase.rpc("has_permission", { permission_key: "dashboard.view" }),
      supabase.from("village_settings").select("name").eq("id", 1).maybeSingle(),
    ]);
    if (!profile?.is_active) redirect("/login?reason=inactive");
    if (!canView) redirect("/no-access");
    userName = profile.display_name || (typeof claims.email === "string" ? claims.email : null);
    userRole = ({ system_admin: "ผู้ดูแลระบบ", village_head: "ผู้ใหญ่บ้าน", registry: "งานทะเบียน", water_operator: "งานประปา", finance_operator: "การเงินและกองทุน", shop_operator: "ร้านค้า", auditor: "ผู้ตรวจสอบ" } as Record<string, string>)[profile.role_id] ?? "เจ้าหน้าที่";
    villageName = settings?.name || "หมู่บ้าน";
  }
  if (!configured && process.env.NODE_ENV === "production") redirect("/setup");
  return <AppShell isDemo={!configured} userName={userName} userRole={userRole} villageName={villageName}>{children}</AppShell>;
}
