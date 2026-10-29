import { KeyRound } from "lucide-react";
import { PasswordChangeForm } from "@/components/password-change-form";

export default function PasswordSettingsPage() {
  return <div className="space-y-5"><header className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><KeyRound size={19} /></span><div><h1 className="text-2xl font-semibold text-slate-900">ความปลอดภัยของบัญชี</h1><p className="mt-1 text-sm text-slate-500">จัดการรหัสผ่านสำหรับบัญชีเจ้าหน้าที่ของคุณ</p></div></header><PasswordChangeForm /></div>;
}
