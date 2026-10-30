"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, useReactTable } from "@tanstack/react-table";
import { Search, Plus, Download, ChevronDown, ChevronLeft, ChevronRight, ArrowUpDown, Filter, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import type { DemoRow } from "@/lib/demo-data";
import { Autocomplete, type AutocompleteOption } from "@/components/ui/autocomplete";

export type WorkspaceColumn = { key: string; label: string; kind?: "text" | "number" | "money" | "status"; options?: string[] };
export type FormField = { key: string; label: string; kind?: "text" | "number" | "date" | "select" | "autocomplete"; options?: Array<string | AutocompleteOption>; required?: boolean; placeholder?: string };

type DataWorkspaceProps = {
  title: string;
  description: string;
  actionLabel: string;
  searchPlaceholder: string;
  columns: WorkspaceColumn[];
  fields: FormField[];
  initialRows: DemoRow[];
  filters?: string[];
  onCreate?: (formData: FormData) => Promise<{ ok: boolean; message: string }>;
  readOnly?: boolean;
  detailBasePath?: string;
};

async function toast(title: string) {
  const Swal = (await import("sweetalert2")).default;
  return Swal.fire({ toast: true, position: "top-end", icon: "success", title, showConfirmButton: false, timer: 2200, customClass: { popup: "village-swal" } });
}

function StatusPill({ value }: { value: string }) {
  const tone = /ปกติ|อนุมัติ|ชำระแล้ว|พร้อมขาย|อาศัยอยู่|บันทึกแล้ว|ปิดบัญชี/.test(value)
    ? "bg-emerald-50 text-emerald-700"
    : /รอตรวจ|รออ่าน|รออนุมัติ|ใกล้หมด|บางส่วน/.test(value)
      ? "bg-amber-50 text-amber-800"
      : /เกินกำหนด|ย้ายออก|ปฏิเสธ/.test(value)
        ? "bg-rose-50 text-rose-700"
        : "bg-slate-100 text-slate-600";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${tone}`}>{value}</span>;
}

export function DataWorkspace({ title, description, actionLabel, searchPlaceholder, columns, fields, initialRows, filters = ["ทั้งหมด", "ปกติ", "รอตรวจ", "เกินกำหนด"], onCreate, readOnly = false, detailBasePath }: DataWorkspaceProps) {
  const router = useRouter();
  const [rows, setRows] = useState(initialRows);
  useEffect(() => setRows(initialRows), [initialRows]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ทั้งหมด");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [formError, setFormError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const dialogTitleId = useId();
  const dialogDescriptionId = useId();

  const filteredRows = useMemo(() => rows.filter((row) => {
    const matchesQuery = !query || Object.values(row).some((value) => String(value).toLowerCase().includes(query.toLowerCase()));
    const matchesStatus = statusFilter === "ทั้งหมด" || Object.values(row).some((value) => String(value) === statusFilter);
    return matchesQuery && matchesStatus;
  }), [query, rows, statusFilter]);

  const tableColumns = useMemo<ColumnDef<DemoRow>[]>(() => columns.map((column) => ({
    accessorKey: column.key,
    header: ({ column: tableColumn }) => <button className="inline-flex items-center gap-1.5 text-left" onClick={tableColumn.getToggleSortingHandler()}>{column.label}<ArrowUpDown size={12} className="text-slate-400" /></button>,
    cell: ({ getValue, row }) => {
      const value = getValue();
      if (column.kind === "status") return <StatusPill value={String(value ?? "—")} />;
      if (column.kind === "money") return <span className="tabular-nums">{formatCurrency(Number(value ?? 0))}</span>;
      if (detailBasePath && column === columns[0] && row.original.detailId) return <Link href={`${detailBasePath}/${row.original.detailId}`} className="font-semibold text-[#0075d1] hover:underline">{String(value ?? "—")}</Link>;
      return <span>{String(value ?? "—")}</span>;
    },
  })), [columns, detailBasePath]);

  const table = useReactTable({ data: filteredRows, columns: tableColumns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(), initialState: { pagination: { pageSize: 8 } } });

  function openCreateDialog() {
    setFormError("");
    formRef.current?.reset();
    dialogRef.current?.showModal();
  }

  async function createRow(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const missing = fields.find((field) => field.required && !String(values[field.key] ?? "").trim());
    if (missing) { setFormError(`กรุณาระบุ${missing.label}`); return; }
    if (onCreate) {
      const result = await onCreate(new FormData(event.currentTarget));
      if (!result.ok) { setFormError(result.message); return; }
      dialogRef.current?.close();
      toast(result.message);
      router.refresh();
      return;
    }
    const row: DemoRow = { id: `SV-${Date.now().toString().slice(-6)}` };
    for (const field of fields) row[field.key] = field.kind === "number" ? Number(values[field.key]) || 0 : String(values[field.key] ?? "");
    for (const column of columns) if (!(column.key in row)) row[column.key] = "—";
    setRows((current) => [row, ...current]);
    dialogRef.current?.close();
    toast("บันทึกรายการตัวอย่างแล้ว");
  }

  async function exportExcel() {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "SmartVill";
    const sheet = workbook.addWorksheet(title.slice(0, 31));
    sheet.columns = columns.map((column) => ({ header: column.label, key: column.key, width: Math.max(14, Math.min(32, column.label.length + 8)) }));
    filteredRows.forEach((row) => sheet.addRow(Object.fromEntries(columns.map((column) => [column.key, row[column.key]]))));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF008BF8" } };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${title}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
    await toast("ส่งออก Excel แล้ว");
  }

  async function exportPdf() {
    try {
      const response = await fetch("/fonts/NotoSansThai.ttf");
      if (!response.ok) throw new Error("ไม่พบฟอนต์ภาษาไทยสำหรับเอกสาร");
      const fontBlob = await response.blob();
      const fontData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("อ่านฟอนต์สำหรับ PDF ไม่สำเร็จ"));
        reader.readAsDataURL(fontBlob);
      });
      const pdfMake = (await import("pdfmake/build/pdfmake")).default;
      pdfMake.addVirtualFileSystem({ "NotoSansThai.ttf": fontData });
      pdfMake.addFonts({ NotoSansThai: { normal: "NotoSansThai.ttf", bold: "NotoSansThai.ttf", italics: "NotoSansThai.ttf", bolditalics: "NotoSansThai.ttf" } });
      const body = [columns.map((column) => ({ text: column.label, style: "tableHeader" })), ...filteredRows.map((row) => columns.map((column) => {
        const value = row[column.key];
        return column.kind === "money" ? formatCurrency(Number(value ?? 0)) : String(value ?? "—");
      }))];
      pdfMake.createPdf({ pageOrientation: "landscape", pageMargins: [28, 36, 28, 36], defaultStyle: { font: "NotoSansThai", fontSize: 8 }, content: [{ text: title, fontSize: 17, bold: true, color: "#172033" }, { text: description, margin: [0, 4, 0, 16], color: "#64748b" }, { table: { headerRows: 1, widths: columns.map(() => "*"), body }, layout: "lightHorizontalLines" }, { text: `รวม ${filteredRows.length} รายการ`, margin: [0, 12, 0, 0], fontSize: 8, color: "#64748b" }], styles: { tableHeader: { bold: true, fillColor: "#eaf5ff", color: "#174366" } } }).download(`${title}.pdf`);
    } catch (cause) {
      const Swal = (await import("sweetalert2")).default;
      await Swal.fire({ icon: "error", title: "ส่งออก PDF ไม่สำเร็จ", text: cause instanceof Error ? cause.message : "กรุณาลองอีกครั้ง", confirmButtonColor: "#008BF8", customClass: { popup: "village-swal" } });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-[24px] font-bold tracking-[-0.03em] text-slate-900 sm:text-[28px]">{title}</h1><p className="mt-1 text-[13px] text-slate-500">{description}</p></div>{readOnly ? <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">การบันทึกข้อมูลโมดูลนี้ยังไม่เปิดใช้งาน</span> : <button onClick={openCreateDialog} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[var(--primary-hover)]"><Plus size={16} />{actionLabel}</button>}</div>

      <div className="rounded-2xl border border-[var(--border)] bg-white">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="relative w-full sm:max-w-[360px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input aria-label={searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} className="h-10 w-full rounded-lg border border-[var(--border)] bg-white pl-9 pr-9 text-[12px] outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-3 focus:ring-blue-100" />{query && <button aria-label="ล้างคำค้น" onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"><X size={14} /></button>}</div>
          <div className="flex flex-wrap items-center gap-2"><div className="relative"><Filter size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" /><select aria-label="กรองสถานะ" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 appearance-none rounded-lg border border-[var(--border)] bg-white pl-8 pr-8 text-[11px] text-slate-600 outline-none focus:border-blue-400"><option value="ทั้งหมด">ทุกสถานะ</option>{filters.filter((filter) => filter !== "ทั้งหมด").map((filter) => <option key={filter}>{filter}</option>)}</select><ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" /></div><button onClick={() => void exportExcel()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"><Download size={14} />Excel</button><button onClick={exportPdf} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"><Download size={14} />PDF</button></div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table data-export-table className="w-full border-collapse text-left"><thead className="bg-slate-50/80"><tr>{table.getHeaderGroups().map((headerGroup) => headerGroup.headers.map((header) => <th key={header.id} className="h-11 whitespace-nowrap border-b border-[var(--border)] px-4 text-[10px] font-semibold text-slate-500 first:pl-5">{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</th>))}</tr></thead>
            <tbody>{table.getRowModel().rows.length === 0 ? <tr><td colSpan={columns.length} className="py-16 text-center text-[12px] text-slate-500">ไม่พบรายการที่ตรงกับการค้นหา</td></tr> : table.getRowModel().rows.map((row) => <tr key={row.id} className="border-b border-slate-100 transition hover:bg-slate-50/70 last:border-0">{row.getVisibleCells().map((cell) => <td key={cell.id} className="h-[54px] whitespace-nowrap px-4 text-[11px] text-slate-700 first:pl-5">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">{table.getRowModel().rows.length === 0 ? <p className="px-4 py-12 text-center text-[12px] text-slate-500">ไม่พบรายการที่ตรงกับการค้นหา</p> : table.getRowModel().rows.map((row) => <article key={row.id} className="space-y-3 px-4 py-4"><div className="flex items-start gap-3"><div className="grid min-w-0 flex-1 grid-cols-2 gap-3">{columns.slice(0, 2).map((column, index) => <div key={column.key} className="min-w-0"><p className="text-[11px] text-slate-500">{column.label}</p>{detailBasePath && index === 0 && row.original.detailId ? <Link href={`${detailBasePath}/${row.original.detailId}`} className="mt-0.5 block break-words text-[13px] font-semibold leading-5 text-[#0075d1] hover:underline">{String(row.original[column.key] ?? "—")}</Link> : <p className="mt-0.5 break-words text-[13px] font-semibold leading-5 text-slate-800">{String(row.original[column.key] ?? "—")}</p>}</div>)}</div>{columns.find((column) => column.kind === "status") && <span className="shrink-0"><StatusPill value={String(row.original[columns.find((column) => column.kind === "status")!.key] ?? "—")} /></span>}</div><div className="flex flex-wrap gap-x-4 gap-y-1.5">{columns.slice(2).filter((column) => column.kind !== "status").map((column) => <p key={column.key} className="text-[11px] leading-4 text-slate-600"><span className="text-slate-500">{column.label}: </span>{column.kind === "money" ? formatCurrency(Number(row.original[column.key] ?? 0)) : String(row.original[column.key] ?? "—")}</p>)}</div></article>)}</div>

        <div className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"><p className="text-[11px] text-slate-600">แสดง {table.getRowModel().rows.length ? table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1 : 0}–{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, filteredRows.length)} จาก {filteredRows.length} รายการ</p><div className="flex items-center gap-2"><button disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} className="flex size-10 items-center justify-center rounded-lg border border-[var(--border)] text-slate-600 disabled:opacity-40" aria-label="หน้าก่อน"><ChevronLeft size={16} /></button><span className="min-w-[84px] text-center text-[11px] text-slate-600">หน้า {table.getState().pagination.pageIndex + 1} / {Math.max(table.getPageCount(), 1)}</span><button disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} className="flex size-10 items-center justify-center rounded-lg border border-[var(--border)] text-slate-600 disabled:opacity-40" aria-label="หน้าถัดไป"><ChevronRight size={16} /></button></div></div>
      </div>

      <dialog ref={dialogRef} aria-labelledby={dialogTitleId} aria-describedby={dialogDescriptionId} className="m-auto w-[calc(100%-28px)] max-w-[520px] rounded-2xl border border-[var(--border)] bg-white p-0 text-[var(--foreground)] shadow-[0_24px_70px_rgb(19_42_71_/_18%)] backdrop:bg-slate-950/35">
        <form ref={formRef} onSubmit={createRow} className="space-y-5 p-5 sm:p-6"><div><h2 id={dialogTitleId} className="text-[18px] font-bold text-slate-900">{actionLabel}</h2><p id={dialogDescriptionId} className="mt-1 text-[12px] text-slate-500">กรอกข้อมูลเพื่อเพิ่มรายการ</p></div><div className="grid gap-4 sm:grid-cols-2">{fields.map((field, index) => <label key={field.key} className="space-y-1.5"><span className="text-[11px] font-semibold text-slate-700">{field.label}{field.required && <span className="ml-1 text-rose-500">*</span>}</span>{field.kind === "autocomplete" ? <Autocomplete name={field.key} required={field.required} autoFocus={index === 0} placeholder={field.placeholder ?? `ค้นหา${field.label}...`} options={(field.options ?? []).filter((option): option is AutocompleteOption => typeof option !== "string")} /> : field.kind === "select" ? <select name={field.key} required={field.required} defaultValue="" autoFocus={index === 0} className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-[12px] outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"><option value="" disabled>เลือก{field.label}</option>{field.options?.map((option) => { const item = typeof option === "string" ? { value: option, label: option } : option; return <option key={item.value} value={item.value}>{item.label}</option>; })}</select> : <input name={field.key} required={field.required} type={field.kind ?? "text"} autoFocus={index === 0} placeholder={field.placeholder} className="h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 text-[12px] outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-3 focus:ring-blue-100" />}</label>)}</div>{formError && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-[11px] text-rose-700">{formError}</p>}<div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4"><button type="button" onClick={() => dialogRef.current?.close()} className="h-9 rounded-lg border border-[var(--border)] px-3.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">ยกเลิก</button><button type="submit" className="h-9 rounded-lg bg-[var(--primary)] px-4 text-[11px] font-semibold text-white hover:bg-[var(--primary-hover)]">บันทึก</button></div></form>
      </dialog>
    </div>
  );
}
