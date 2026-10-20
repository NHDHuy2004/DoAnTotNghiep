import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "HAEIM_Damped — Khai thác tập mục hiệu suất trung bình cao",
  description:
    "Hệ thống phân tích thuật toán khai thác tập mục HAEI theo mô hình suy giảm HAEIM_Damped: Construction → Restructure → Expansion.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
