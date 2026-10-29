import { FileSpreadsheet, FileText, ShieldCheck } from "lucide-react";

const reports = [
  { title: "ทะเบียนครัวเรือนและประชากร", detail: "จำนวนครัวเรือน สมาชิก และสถานะการอยู่อาศัย", icon: FileSpreadsheet, href: "/households" },
  { title: "สรุปการใช้น้ำและลูกหนี้", detail: "ปริมาณใช้น้ำ ยอดเรียกเก็บ ยอดรับ และยอดค้าง", icon: FileText, href: "/water/billing" },
  { title: "รายการอ่านมิเตอร์ที่ต้องตรวจ", detail: "เลขอ่านผิดปกติหรือสูงกว่าค่าที่ตั้งไว้", icon: ShieldCheck, href: "/water/readings" },
  { title: "บัญชีและกองทุน", detail: "รายการรออนุมัติ รายรับ รายจ่าย และยอดคงเหลือ", icon: FileSpreadsheet, href: "/finance/funds" },
  { title: "สินเชื่อและงวดค้างชำระ", detail: "ยอดเงินต้น ดอกเบี้ย และสถานะสัญญา", icon: FileText, href: "/finance/loans" },
  { title: "สินค้าและยอดขาย", detail: "สินค้าคงเหลือ รายการขาย และสินค้าใกล้หมด", icon: FileSpreadsheet, href: "/store" },
];

export default function ReportsPage() {
  return <div className="space-y-6"><div><h1 className="text-[24px] font-bold tracking-[-0.03em] text-slate-900 sm:text-[28px]">รายงาน</h1><p className="mt-1 text-[13px] text-slate-500">เลือกชุดข้อมูลเพื่อดูรายละเอียดและส่งออกเป็น Excel หรือ PDF</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{reports.map(({ title, detail, icon: Icon, href }) => <a key={title} href={href} className="group rounded-2xl border border-[var(--border)] bg-white p-5 transition hover:border-blue-200 hover:shadow-sm"><span className="flex size-10 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[#0075d1]"><Icon size={19} /></span><h2 className="mt-4 text-[14px] font-semibold text-slate-800">{title}</h2><p className="mt-1 text-[12px] leading-5 text-slate-500">{detail}</p><span className="mt-4 inline-block text-[11px] font-semibold text-[#0075d1] group-hover:underline">เปิดข้อมูลและส่งออก →</span></a>)}</div><div className="rounded-xl border border-sky-100 bg-sky-50 p-4 text-[12px] leading-5 text-sky-900">รายงานที่แสดงในโหมดสาธิตเป็นข้อมูลตัวอย่าง เมื่อเชื่อมฐานข้อมูลและตั้งค่าสิทธิ์แล้ว ให้เลือกข้อมูลจากหน้าระบบที่เกี่ยวข้องก่อนส่งออก</div></div>;
}
