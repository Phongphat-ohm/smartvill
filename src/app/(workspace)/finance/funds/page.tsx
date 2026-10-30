import { FundManagement } from "@/components/fund-management";
import { fundRows } from "@/lib/demo-data";
import { getAuthenticatedProfile, hasPermission, logDataError } from "@/lib/data-access";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function FundsPage() {
  if (!isSupabaseConfigured()) return <div className="space-y-5"><header><h1 className="text-2xl font-semibold text-slate-900">บัญชีกองทุน</h1><p className="mt-1 text-sm text-slate-500">ติดตามเงินเข้า–ออก สมาชิก และรายการที่รออนุมัติ</p></header><FundManagement funds={[]} transactions={fundRows.map((row, index) => ({ id: `demo-${index}`, transaction_no: String(row.id), fund_id: "", account_id: "", type: String(row.type), amount: Number(row.amount), description: String(row.description), status: index === 0 ? "pending" : "approved", created_by: "", created_at: new Date().toISOString() }))} userId="" canCreate={false} canApprove={false} demo /></div>;
  let profile: Awaited<ReturnType<typeof getAuthenticatedProfile>>;
  let canView: boolean; let canCreate: boolean; let canApprove: boolean;
  try {
    profile = await getAuthenticatedProfile();
    [canView, canCreate, canApprove] = await Promise.all([hasPermission("fund.view", profile), hasPermission("fund.transaction.create", profile), hasPermission("fund.transaction.approve", profile)]);
  } catch (error) {
    const requestId = await logDataError("finance.funds.authorization", error);
    return <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">ตรวจสอบสิทธิ์หรือโหลดข้อมูลกองทุนไม่สำเร็จ รหัสอ้างอิง {requestId}</p>;
  }
  if (!canView) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">บัญชีนี้ไม่มีสิทธิ์ดูข้อมูลในโมดูลนี้</div>;
  try {
    const [fundRowsData, transactionRows] = await Promise.all([
      prisma.fund.findMany({ where: { isActive: true }, select: { id: true, name: true, accounts: { where: { isActive: true }, select: { id: true, name: true, fundId: true } } }, orderBy: { name: "asc" } }),
      prisma.fundTransaction.findMany({ select: { id: true, transactionNo: true, fundId: true, accountId: true, type: true, amount: true, description: true, status: true, createdBy: true, createdAt: true, fund: { select: { name: true } }, account: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 1000 }),
    ]);
    const funds = fundRowsData.map((fund) => ({ id: fund.id, name: fund.name, accounts: fund.accounts.map((account) => ({ id: account.id, name: account.name, fund_id: account.fundId })) }));
    const transactions = transactionRows.map((row) => ({ id: row.id, transaction_no: row.transactionNo, fund_id: row.fundId, account_id: row.accountId, type: row.type.toLowerCase(), amount: Number(row.amount), description: row.description, status: row.status.toLowerCase(), created_by: row.createdBy, created_at: row.createdAt.toISOString(), fund: { name: row.fund.name }, account: { name: row.account.name } }));
    return <div className="space-y-5"><header><h1 className="text-2xl font-semibold text-slate-900">บัญชีกองทุน</h1><p className="mt-1 text-sm text-slate-500">ติดตามเงินเข้า–ออก สมาชิก และรายการที่รออนุมัติ</p></header><FundManagement funds={funds as never} transactions={transactions as never} userId={profile?.id ?? ""} canCreate={canCreate} canApprove={canApprove} /></div>;
  } catch (error) {
    const requestId = await logDataError("finance.funds.load", error);
    return <div className="space-y-5"><header><h1 className="text-2xl font-semibold text-slate-900">บัญชีกองทุน</h1></header><p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">โหลดข้อมูลกองทุนไม่สำเร็จ รหัสอ้างอิง {requestId}</p></div>;
  }
}
