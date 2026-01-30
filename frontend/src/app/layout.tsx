import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

/**
 * Viewport 설정 - 모바일 반응형 지원
 * 참고: https://nextjs.org/docs/app/api-reference/functions/generate-viewport
 *
 * - width: device-width - 디바이스 너비에 맞춤
 * - initialScale: 1 - 초기 줌 레벨
 * - maximumScale: 1 - 스프레드시트 앱은 핀치줌 방지 권장
 * - userScalable: false - 더블탭 줌 방지 (스프레드시트 조작과 충돌 방지)
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover', // 노치 디바이스 지원
};

export const metadata: Metadata = {
  title: "인디밸런싱 - 인디게임 밸런스 툴",
  description: "인디게임 개발자를 위한 게임 밸런스 데이터 관리 툴. 엑셀보다 게임 개발에 특화된 시트 시스템과 수식을 제공합니다.",
  keywords: ["게임 밸런스", "인디게임", "게임 개발", "밸런싱 툴", "게임 기획", "인디밸런싱"],
  icons: {
    icon: [
      {
        url: '/icon.svg',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark.svg',
        media: '(prefers-color-scheme: dark)',
      },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
