"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { saveVillageSettingsAction } from "@/app/actions";

const inputClass = "h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-[12px] outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100";

type Settings = { name: string; moo: string | null; subdistrict: string | null; district: string | null; province: string | null; postal_code: string | null; max_monthly_water_use: number };

export function SettingsForm({ initial, isDemo }: { initial: Settings | null; isDemo: boolean }) {
  const [saved, setSaved] = useState(false);
  async function submit(formData: FormData) {
    if (isDemo) { setSaved(true); void Swal.fire({ icon: "info", title: "โหมดสาธิต", text: "การตั้งค่านี้ยังไม่ได้บันทึกลงฐานข้อมูล", confirmButtonColor: "#008BF8", customClass: { popup: "village-swal" } }); return; }
    const result = await saveVillageSettingsAction(formData);
    if (!result.ok) { void Swal.fire({ icon: "error", title: "บันทึกไม่สำเร็จ", text: result.message, confirmButtonColor: "#008BF8", customClass: { popup: "village-swal" } }); return; }
    setSaved(true);
    void Swal.fire({ icon: "success", title: "บันทึกการตั้งค่าแล้ว", text: result.message, confirmButtonColor: "#008BF8", customClass: { popup: "village-swal" } });
  }
  return <form action={submit} className="space-y-5">
    <section className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6"><h2 className="text-[14px] font-semibold text-slate-800">ข้อมูลหมู่บ้าน</h2><p className="mt-1 text-[11px] text-slate-500">ใช้แสดงบนหน้าจอ เอกสารแจ้งหนี้ และใบเสร็จ</p><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[["name", "ชื่อหมู่บ้าน", initial?.name ?? ""], ["moo", "หมู่ที่", initial?.moo ?? ""], ["subdistrict", "ตำบล", initial?.subdistrict ?? ""], ["district", "อำเภอ", initial?.district ?? ""], ["province", "จังหวัด", initial?.province ?? ""], ["postal_code", "รหัสไปรษณีย์", initial?.postal_code ?? ""]].map(([key, label, value]) => <label key={key} className="space-y-1.5"><span className="text-[11px] font-medium text-slate-700">{label}</span><input name={key} required className={inputClass} defaultValue={value} /></label>)}</div></section>
    <section className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6"><h2 className="text-[14px] font-semibold text-slate-800">การตรวจมิเตอร์</h2><p className="mt-1 text-[11px] text-slate-500">เลขมิเตอร์ที่ใช้น้ำเกินค่านี้จะถูกพักไว้ให้เจ้าหน้าที่ตรวจสอบ</p><div className="mt-5 max-w-sm"><label className="space-y-1.5"><span className="text-[11px] font-medium text-slate-700">ปริมาณใช้สูงสุดก่อนพักตรวจ (ลบ.ม./เดือน)</span><input name="maxMonthlyWaterUse" className={inputClass} type="number" min="1" step="0.001" required defaultValue={initial?.max_monthly_water_use ?? (isDemo ? 100 : "")} /></label></div></section>
    {saved && <p role="status" className="text-[11px] text-emerald-700">บันทึกข้อมูลแล้ว</p>}<Button type="submit" size="lg" className="h-10 gap-2 px-4"><Save size={15} />บันทึกการตั้งค่า</Button>
  </form>;
}
