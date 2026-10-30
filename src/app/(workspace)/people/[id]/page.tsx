import { notFound } from "next/navigation";
import { ResidentDetail } from "@/components/registry-detail";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";

export default async function ResidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) return <div className="rounded-xl border border-sky-100 bg-sky-50 p-5 text-sm text-sky-900">หน้ารายละเอียดทะเบียนใช้ได้เมื่อเชื่อมต่อ Supabase</div>;
  const supabase = await createServerSupabaseClient();
  const [{ data: canView }, { data: canEdit }, { data: canSensitive }, { data, error }, { data: householdRows }] = await Promise.all([
    supabase.rpc("has_permission", { permission_key: "registry.resident.view" }),
    supabase.rpc("has_permission", { permission_key: "registry.resident.update" }),
    supabase.rpc("has_permission", { permission_key: "registry.resident.sensitive.read" }),
    supabase.from("residents").select("id,first_name,last_name,birth_date,phone,residency_status,national_id_ciphertext,memberships:household_memberships(relationship,is_head,move_in_at,move_out_at,move_reason,household:households(id,house_number,moo))").eq("id", id).maybeSingle(),
    supabase.from("households").select("id,house_number,moo").neq("occupancy_status", "archived").order("house_number").limit(1000),
  ]);
  if (!canView) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">บัญชีนี้ไม่มีสิทธิ์ดูข้อมูลประชากร</p>;
  if (error) return <p className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">โหลดข้อมูลประชากรไม่สำเร็จ</p>;
  if (!data) notFound();
  const history = (data.memberships ?? []).map((item) => { const household = item.household as unknown as { id: string; house_number: string; moo: string } | null; return { householdId: household?.id ?? "", householdLabel: household ? `บ้านเลขที่ ${household.house_number} หมู่ ${household.moo}` : "ไม่พบครัวเรือน", relationship: item.relationship, isHead: item.is_head, moveInAt: item.move_in_at, moveOutAt: item.move_out_at, moveReason: item.move_reason }; }).sort((a, b) => b.moveInAt.localeCompare(a.moveInAt));
  return <ResidentDetail resident={{ id: data.id, firstName: data.first_name, lastName: data.last_name, birthDate: data.birth_date ?? "", phone: data.phone ?? "", status: data.residency_status, hasNationalId: Boolean(data.national_id_ciphertext) }} history={history} households={(householdRows ?? []).map((item) => ({ id: item.id, label: `บ้านเลขที่ ${item.house_number} หมู่ ${item.moo}` }))} canEdit={Boolean(canEdit)} canSensitive={Boolean(canSensitive)} />;
}
