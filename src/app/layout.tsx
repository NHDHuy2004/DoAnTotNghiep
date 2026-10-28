import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

// Font tự dựng (offline khi build) — Be Vietnam Pro cho tiếng Việt, JetBrains Mono cho số liệu.
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/be-vietnam-pro/800.css";
import "@fontsource-variable/jetbrains-mono/wght.css";

import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

const SITE_NAME = "HAEIM_Damped";
const SITE_DESCRIPTION =
  "Hệ thống phân tích thuật toán khai thác tập mục HAEI theo mô hình suy giảm HAEIM_Damped: Construction → Restructure → Expansion.";

export const metadata: Metadata = {
  metadataBase: new URL("https://haeim.local"),
  title: {
    default: `${SITE_NAME} — Khai thác tập mục hiệu suất trung bình cao`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "khai thác tập mục",
    "itemset mining",
    "HAEI",
    "HAEIM_Damped",
    "thuật toán suy giảm",
    "phân tích dữ liệu",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Khai thác tập mục hiệu suất trung bình cao`,
    description: SITE_DESCRIPTION,
    locale: "vi_VN",
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f6fa",
  width: "device-width",
  initialScale: 1,
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
