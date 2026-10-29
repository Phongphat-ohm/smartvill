export type FlatTariff = {
  mode: "flat";
  ratePerCubicMeter: number;
  serviceFee: number;
};

export type ProgressiveTariff = {
  mode: "progressive";
  tiers: Array<{ upToCubicMeters: number | null; ratePerCubicMeter: number }>;
  serviceFee: number;
};

export type WaterTariff = FlatTariff | ProgressiveTariff;

export type ReadingReview = {
  requiresReview: boolean;
  reason: "decrease" | "high_usage" | null;
  usage: number | null;
};

const roundSatang = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;

export function calculateWaterCharge(usage: number, tariff: WaterTariff): number {
  if (!Number.isFinite(usage) || usage < 0) throw new Error("ปริมาณใช้น้ำต้องไม่ติดลบ");
  if (!Number.isFinite(tariff.serviceFee) || tariff.serviceFee < 0) throw new Error("ค่าบริการไม่ถูกต้อง");

  if (tariff.mode === "flat") {
    if (tariff.ratePerCubicMeter < 0) throw new Error("อัตราค่าน้ำไม่ถูกต้อง");
    return roundSatang(tariff.serviceFee + usage * tariff.ratePerCubicMeter);
  }

  const tiers = [...tariff.tiers].sort((a, b) => (a.upToCubicMeters ?? Infinity) - (b.upToCubicMeters ?? Infinity));
  let remaining = usage;
  let lowerBound = 0;
  let waterCharge = 0;

  for (const tier of tiers) {
    if (tier.ratePerCubicMeter < 0 || (tier.upToCubicMeters !== null && tier.upToCubicMeters <= lowerBound)) {
      throw new Error("ช่วงอัตราค่าน้ำไม่ถูกต้อง");
    }
    const capacity = tier.upToCubicMeters === null ? remaining : tier.upToCubicMeters - lowerBound;
    const chargedUnits = Math.min(remaining, capacity);
    waterCharge += chargedUnits * tier.ratePerCubicMeter;
    remaining -= chargedUnits;
    if (tier.upToCubicMeters !== null) lowerBound = tier.upToCubicMeters;
    if (remaining <= 0) break;
  }

  if (remaining > 0) throw new Error("อัตราค่าน้ำยังไม่ครอบคลุมปริมาณใช้");
  return roundSatang(tariff.serviceFee + waterCharge);
}

export function evaluateReading(previous: number, current: number, maxMonthlyUsage = 100): ReadingReview {
  if (![previous, current, maxMonthlyUsage].every(Number.isFinite) || previous < 0 || current < 0) {
    throw new Error("เลขมิเตอร์ไม่ถูกต้อง");
  }
  if (current < previous) return { requiresReview: true, reason: "decrease", usage: null };
  const usage = current - previous;
  if (usage > maxMonthlyUsage) return { requiresReview: true, reason: "high_usage", usage };
  return { requiresReview: false, reason: null, usage };
}

export function applyWaterPayment(balance: number, payment: number) {
  if (balance < 0 || payment <= 0 || !Number.isFinite(balance + payment)) throw new Error("ยอดชำระไม่ถูกต้อง");
  if (payment > balance) throw new Error("ยอดชำระสูงกว่ายอดค้าง");
  const remaining = roundSatang(balance - payment);
  return { remaining, status: remaining === 0 ? "paid" as const : "partially_paid" as const };
}
