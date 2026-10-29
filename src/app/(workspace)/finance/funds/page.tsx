import { FundManagement } from "@/components/fund-management";
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { fundRows } from "@/lib/demo-data";

export default async function FundsPage() {
  if (!isSupabaseConfigured()) return <div className="space-y-5"><header><h1 className="text-2xl font-semibold text-slate-900">บัญชีกองทุน</h1><p className="mt-1 text-sm text-slate-500">ติดตามเงินเข้า–ออก สมาชิก และรายการที่รออนุมัติ</p></header><FundManagement funds={[]} transactions={fundRows.map((row, index) => ({ id: `demo-${index}`, transaction_no: String(row.id), fund_id: "", account_id: "", type: String(row.type), amount: Number(row.amount), description: String(row.description), status: index === 0 ? "pending" : "approved", created_by: "", created_at: new Date().toISOString() }))} userId="" canCreate={false} canApprove={false} demo /></div>;
  const supabase = await createServerSupabaseClient();
  const [{ data: userData }, { data: canView }, { data: canCreate }, { data: canApprove }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc("has_permission", { permission_key: "fund.view" }),
    supabase.rpc("has_permission", { permission_key: "fund.transaction.create" }),
    supabase.rpc("has_permission", { permission_key: "fund.transaction.approve" }),
  ]);
  if (!canView) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">บัญชีนี้ไม่มีสิทธิ์ดูข้อมูลในโมดูลนี้</div>;
  const [{ data: fundRowsData, error: fundError }, { data: transactionRows, error: transactionError }] = await Promise.all([
    supabase.from("funds").select("id,name,accounts:fund_accounts(id,name,fund_id)").eq("is_active", true).order("name"),
    supabase.from("fund_transactions").select("id,transaction_no,fund_id,account_id,type,amount,description,status,created_by,created_at,fund:funds(name),account:fund_accounts(name)").order("created_at", { ascending: false }).limit(1000),
  ]);
  const error = fundError || transactionError;
  return <div className="space-y-5"><header><h1 className="text-2xl font-semibold text-slate-900">บัญชีกองทุน</h1><p className="mt-1 text-sm text-slate-500">ติดตามเงินเข้า–ออก สมาชิก และรายการที่รออนุมัติ</p></header>{error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">โหลดข้อมูลกองทุนไม่สำเร็จ ตรวจสอบ migration และสิทธิ์ของบัญชี</p> : <FundManagement funds={(fundRowsData ?? []) as never} transactions={(transactionRows ?? []) as never} userId={userData.user?.id ?? ""} canCreate={Boolean(canCreate)} canApprove={Boolean(canApprove)} />}</div>;
}
