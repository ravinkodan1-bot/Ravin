import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SkyNovara | Premium AI Automation Agency",
  description: "Automate Everything. Scale Without Hiring. SkyNovara helps businesses automate their complete operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} font-sans bg-[#050816] text-white min-h-screen`}
      >
        <div className="bg-aurora" />
        {children}
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  );
}
