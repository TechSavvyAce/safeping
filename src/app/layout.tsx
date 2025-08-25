// =================================
// 🏗️ Root Layout - Next.js App Router
// =================================

import type { Metadata } from "next";
import { Inter, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/components/providers/I18nProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { WalletProvider } from "@/components/providers/WalletProvider";

const inter = Inter({ subsets: ["latin"] });
const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-sc",
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "加密货币支付平台",
  description: "安全的USDT多链支付平台，支持BSC、以太坊和波场网络",
  keywords: [
    "加密货币",
    "数字货币支付",
    "USDT",
    "BSC",
    "以太坊",
    "波场",
    "区块链支付",
    "crypto",
    "payment",
  ],
  authors: [{ name: "Crypto Payment Platform" }],

  robots: "index, follow",
  openGraph: {
    title: "加密货币支付平台",
    description: "安全的USDT多链支付平台，支持多个区块链网络",
    type: "website",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crypto Payment Platform",
    description:
      "Secure USDT payment platform supporting multiple blockchain networks",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="h-full" suppressHydrationWarning>
      <head>
        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />

        {/* Favicon and app icons */}
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/manifest.json" />

        {/* Security headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />

        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />

        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#3B82F6" />
        <meta name="msapplication-TileColor" content="#3B82F6" />

        {/* Prevent theme hydration mismatch */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 'dark';
                const resolvedTheme = theme === 'system' 
                  ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                  : theme;
                document.documentElement.classList.add(resolvedTheme);
              } catch (e) {
                document.documentElement.classList.add('dark');
              }
            `,
          }}
        />
      </head>
      <body
        className={`${inter.className} ${notoSansSC.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider defaultTheme="dark">
          <I18nProvider>
            <WalletProvider>
              {/* Global wrapper with dark mode support */}
              <div className="min-h-full bg-white dark:bg-gray-900 transition-colors duration-200">
                {children}
              </div>
            </WalletProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
