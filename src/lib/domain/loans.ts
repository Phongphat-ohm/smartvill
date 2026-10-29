export type LoanRateMode = "flat" | "declining";

export type LoanInstallment = {
  installment: number;
  principal: number;
  interest: number;
  total: number;
  remainingPrincipal: number;
};

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function createLoanSchedule(principal: number, annualRatePercent: number, months: number, mode: LoanRateMode): LoanInstallment[] {
  if (!Number.isFinite(principal) || principal <= 0 || annualRatePercent < 0 || !Number.isInteger(months) || months < 1) {
    throw new Error("ข้อมูลสินเชื่อไม่ถูกต้อง");
  }

  const monthlyRate = annualRatePercent / 100 / 12;
  const totalFlatInterest = mode === "flat" ? money(principal * monthlyRate * months) : 0;
  const regularPrincipal = principal / months;
  const reducingPayment = monthlyRate === 0
    ? regularPrincipal
    : principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months));
  let remaining = principal;

  return Array.from({ length: months }, (_, index) => {
    const interest = mode === "flat" ? money(totalFlatInterest / months) : money(remaining * monthlyRate);
    const principalPaid = index === months - 1
      ? money(remaining)
      : mode === "flat" ? money(regularPrincipal) : money(Math.min(remaining, reducingPayment - interest));
    remaining = money(Math.max(0, remaining - principalPaid));
    return {
      installment: index + 1,
      principal: principalPaid,
      interest,
      total: money(principalPaid + interest),
      remainingPrincipal: remaining,
    };
  });
}
