import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Excalidraw Cloud - Personal Whiteboard",
  description: "Your secure, personal whiteboard cloud storage.",
};

import { Providers } from "@/components/Providers";

// ... (keep existing imports if any, but replace_file_content replaces the block. 
// I need to be careful. I will use a larger block or do it in two steps if needed, 
// but here I can probably replace the body content or the whole file logic.)

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
