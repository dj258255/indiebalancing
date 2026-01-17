import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "인디밸런싱 - 인디게임 밸런스 툴",
  description: "인디게임 개발자를 위한 게임 밸런스 데이터 관리 툴. 엑셀보다 게임 개발에 특화된 시트 시스템과 수식을 제공합니다.",
  keywords: ["게임 밸런스", "인디게임", "게임 개발", "밸런싱 툴", "게임 기획", "인디밸런싱"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
