import type { Metadata } from "next";
import { headers } from "next/headers";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "../public/fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "../public/fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${protocol}://${host}` : "https://ielts-route.local";
  const imageUrl = `${origin}/og-phrases.png`;

  return {
    title: "雅思听说｜990句口语密码与正式备考系统",
    description:
      "完整收录990句高频口语表达，支持每日10句、双语搜索、美音跟读、精句收藏与听写回忆，并结合完整雅思听说训练路线。",
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: "雅思学习APP",
      statusBarStyle: "black-translucent",
    },
    openGraph: {
      title: "雅思听说｜990句口语密码",
      description: "每天10句，从理解、跟读到主动默写，把990句练成开口就来的表达。",
      type: "website",
      locale: "zh_CN",
      images: [{ url: imageUrl, width: 1729, height: 910, alt: "雅思听说990句口语密码" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "雅思听说｜990句口语密码",
      description: "每天10句，从理解、跟读到主动默写，把990句练成开口就来的表达。",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}",
          }}
        />
      </body>
    </html>
  );
}
