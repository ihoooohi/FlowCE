import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "轻盈计划 · 3 分钟健康测评",
  description:
    "回答 4 个问题,获得基于你身体数据的专属健康计划:BMI 评估、每日热量建议与达成日期预测。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
