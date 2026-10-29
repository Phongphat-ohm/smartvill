import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SmartVill | ระบบบริหารจัดการหมู่บ้าน",
    template: "%s | SmartVill",
  },
  description: "ระบบงานทะเบียน ประปา การเงิน กองทุน และร้านค้าหมู่บ้าน",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className="font-sans">
      <body>{children}</body>
    </html>
  );
}
