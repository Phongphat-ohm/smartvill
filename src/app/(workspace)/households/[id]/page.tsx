import { notFound } from "next/navigation";
import { HouseholdDetail } from "@/components/registry-detail";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";

export default async function HouseholdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isSupabaseConfigured()) return <div className="rounded-xl border border-sky-100 bg-sky-50 p-5 text-sm text-sky-900">หน้ารายละเอียดทะเบียนใช้ได้เมื่อเชื่อมต่อ Supabase</div>;
  const supabase = await createServerSupabaseClient();
  const [{ data: canView }, { data: canEdit }, { data, error }] = await Promise.all([
    supabase.rpc("has_permission", { permission_key: "registry.household.view" }),
    supabase.rpc("has_permission", { permission_key: "registry.household.update" }),
    supabase.from("households").select("id,house_number,moo,road,subdistrict,district,province,postal_code,household_type,occupancy_status,note,memberships:household_memberships(move_in_at,move_out_at,move_reason,is_head,resident:residents(id,first_name,last_name))").eq("id", id).maybeSingle(),
  ]);
  if (!canView) return <p className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">บัญชีนี้ไม่มีสิทธิ์ดูครัวเรือน</p>;
  if (error) return <p className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">โหลดข้อมูลครัวเรือนไม่สำเร็จ</p>;
  if (!data) notFound();
  const members = (data.memberships ?? []).filter((item) => !item.move_out_at).map((item) => {
    const resident = item.resident as unknown as { id: string; first_name: string; last_name: string } | null;
    return { id: resident?.id ?? "", name: `${resident?.first_name ?? ""} ${resident?.last_name ?? ""}`.trim() || "ไม่พบชื่อ", relationship: item.is_head ? "หัวหน้าครัวเรือน" : "สมาชิก", isHead: item.is_head, moveInAt: item.move_in_at, moveOutAt: item.move_out_at, moveReason: item.move_reason };
  });
  return <HouseholdDetail household={{ id: data.id, houseNumber: data.house_number, moo: data.moo, road: data.road ?? "", subdistrict: data.subdistrict, district: data.district, province: data.province, postalCode: data.postal_code, type: data.household_type, status: data.occupancy_status, note: data.note ?? "" }} members={members} canEdit={Boolean(canEdit)} />;
}
