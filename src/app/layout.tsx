import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SmartVill | ระบบบริหารจัดการหมู่บ้าน",
    template: "%s | SmartVill",
  },
  description: "ระบบงานทะเบียน ประปา การเงิน กองทุน และร้านค้าหมู่บ้าน",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f8fc",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className="font-sans">
      <body>{children}</body>
    </html>
  );
}
