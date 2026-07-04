import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Field Day — find your person through play",
  description: "Field Day matches you with people through async games. Play first. Connect after.",
  openGraph: {
    title: "Field Day",
    description: "Find your person through play.",
    siteName: "Field Day",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
