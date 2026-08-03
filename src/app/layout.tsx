import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "مغسلة جيت كلين - نظام إدارة الفروع",
  description: "نظام إدارة مغاسل جيت كلين",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-slate-900 text-slate-100 font-[Cairo]">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
