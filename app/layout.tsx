import type { Metadata, Viewport } from "next";
import PWARegister from "@/components/PWARegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "Community Feed",
  description: "한국 커뮤니티 게시판 모아보기",
  manifest: "/manifest.json",
  applicationName: "Community Feed",
  referrer: "no-referrer",
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
