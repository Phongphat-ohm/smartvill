export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 2 }).format(value);

export const formatNumber = (value: number) => new Intl.NumberFormat("th-TH").format(value);

export function formatThaiDate(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    day: "numeric", month: "short", year: "numeric", ...options,
  }).format(typeof value === "string" ? new Date(value) : value);
}
