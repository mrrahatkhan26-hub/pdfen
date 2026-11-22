import type { Metadata } from "next";
import { Tiro_Bangla } from "next/font/google";
import "./globals.css";

const tiroBangla = Tiro_Bangla({
  subsets: ["bengali", "latin"],
  weight: ["400"],
  variable: "--font-tiro-bangla",
});

export const metadata: Metadata = {
  title: "PDF Notes",
  description: "Personal PDF reader & annotator",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className={tiroBangla.variable}>
      <body className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
