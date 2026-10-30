"use client";

import { useEffect, useState } from "react";
import { Autocomplete, type AutocompleteOption } from "@/components/ui/autocomplete";

type SubdistrictOption = AutocompleteOption & { postalCode: string };

async function fetchAddressOptions<T extends AutocompleteOption>(
  params: URLSearchParams,
  signal: AbortSignal,
) {
  const response = await fetch(`/api/thai-address?${params}`, { signal });
  if (!response.ok) throw new Error("โหลดข้อมูลที่อยู่ไม่สำเร็จ");
  return response.json() as Promise<T[]>;
}

export function ThaiAddressFields({
  subdistrict = "",
  district = "",
  province = "",
  postalCode = "",
  required = true,
  names = { subdistrict: "subdistrict", district: "district", province: "province", postalCode: "postalCode" },
}: {
  subdistrict?: string;
  district?: string;
  province?: string;
  postalCode?: string;
  required?: boolean;
  names?: { subdistrict: string; district: string; province: string; postalCode: string };
}) {
  const [selection, setSelection] = useState({ subdistrict, district, province, postalCode });
  const [provinceOptions, setProvinceOptions] = useState<AutocompleteOption[]>([]);
  const [districtOptions, setDistrictOptions] = useState<AutocompleteOption[]>([]);
  const [subdistrictOptions, setSubdistrictOptions] = useState<SubdistrictOption[]>([]);
  const [loadingLevel, setLoadingLevel] = useState("จังหวัด");
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoadingLevel("จังหวัด");
    setLoadError("");
    void fetchAddressOptions<AutocompleteOption>(new URLSearchParams({ level: "provinces" }), controller.signal)
      .then(setProvinceOptions)
      .catch(() => { if (!controller.signal.aborted) setLoadError("โหลดรายชื่อจังหวัดไม่สำเร็จ"); })
      .finally(() => { if (!controller.signal.aborted) setLoadingLevel(""); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setDistrictOptions([]);
    setSubdistrictOptions([]);
    if (!selection.province) {
      return;
    }
    if (!provinceOptions.some((option) => option.value === selection.province)) return;

    const controller = new AbortController();
    setLoadingLevel("อำเภอ");
    setLoadError("");
    void fetchAddressOptions<AutocompleteOption>(new URLSearchParams({ level: "districts", province: selection.province }), controller.signal)
      .then(setDistrictOptions)
      .catch(() => { if (!controller.signal.aborted) setLoadError("โหลดรายชื่ออำเภอไม่สำเร็จ"); })
      .finally(() => { if (!controller.signal.aborted) setLoadingLevel(""); });
    return () => controller.abort();
  }, [provinceOptions, selection.province]);

  useEffect(() => {
    setSubdistrictOptions([]);
    if (!selection.district) {
      return;
    }
    if (!districtOptions.some((option) => option.value === selection.district)) return;

    const controller = new AbortController();
    setLoadingLevel("ตำบล");
    setLoadError("");
    void fetchAddressOptions<SubdistrictOption>(new URLSearchParams({ level: "subdistricts", province: selection.province, district: selection.district }), controller.signal)
      .then(setSubdistrictOptions)
      .catch(() => { if (!controller.signal.aborted) setLoadError("โหลดรายชื่อตำบลไม่สำเร็จ"); })
      .finally(() => { if (!controller.signal.aborted) setLoadingLevel(""); });
    return () => controller.abort();
  }, [districtOptions, selection.district, selection.province]);

  useEffect(() => {
    const form = document.getElementById(names.province)?.closest("form");
    const reset = () => setSelection({ subdistrict, district, province, postalCode });
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [district, names.province, postalCode, province, subdistrict]);

  const fieldClass = "space-y-1.5";
  const labelClass = "text-xs font-semibold";
  const zipInputClass = "h-11 w-full rounded-lg border border-[var(--border)] bg-slate-50 px-3 text-sm text-slate-700";

  function pickProvince(value: string) {
    if (!value) setLoadingLevel("");
    setSelection((current) => ({ ...current, province: value, district: "", subdistrict: "", postalCode: "" }));
  }

  function pickDistrict(value: string) {
    if (!value) setLoadingLevel("");
    setSelection((current) => ({ ...current, district: value, subdistrict: "", postalCode: "" }));
  }

  function pickSubdistrict(value: string) {
    const item = subdistrictOptions.find((option) => option.value === value);
    setSelection((current) => ({ ...current, subdistrict: value, postalCode: item?.postalCode ?? "" }));
  }

  return <>
    <label className={fieldClass}><span className={labelClass}>จังหวัด{required && <span className="ml-1 text-rose-600">*</span>}</span><Autocomplete name={names.province} required={required} defaultValue={selection.province} options={provinceOptions} onValueChange={pickProvince} /></label>
    <label className={fieldClass}><span className={labelClass}>อำเภอ/เขต{required && <span className="ml-1 text-rose-600">*</span>}</span><Autocomplete key={`district-${selection.province}-${selection.district}`} name={names.district} required={required} defaultValue={selection.district} options={districtOptions} onValueChange={pickDistrict} /></label>
    <label className={fieldClass}><span className={labelClass}>ตำบล/แขวง{required && <span className="ml-1 text-rose-600">*</span>}</span><Autocomplete key={`subdistrict-${selection.province}-${selection.district}`} name={names.subdistrict} required={required} defaultValue={selection.subdistrict} options={subdistrictOptions} onValueChange={pickSubdistrict} /></label>
    <label className={fieldClass}><span className={labelClass}>รหัสไปรษณีย์</span><input name={names.postalCode} value={selection.postalCode} readOnly required={required} placeholder="เลือกรายการตำบลเพื่อเติมอัตโนมัติ" className={zipInputClass} /></label>
    {loadingLevel && <p role="status" className="text-xs text-slate-500 sm:col-span-2">กำลังโหลด{loadingLevel}...</p>}
    {loadError && <p role="alert" className="text-xs text-rose-700 sm:col-span-2">{loadError} กรุณาลองเลือกใหม่อีกครั้ง</p>}
  </>;
}
