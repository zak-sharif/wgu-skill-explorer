import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WGU Skill Explorer",
  description: "Explore Western Governors University's Rich Skill Descriptor library",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body
        className="min-h-full bg-slate-50 text-slate-900"
        style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}
      >
        {children}
      </body>
    </html>
  );
}
