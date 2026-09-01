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

const RootLayout = ({ children }: LayoutProps<"/">) => (
  <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
    <body>{children}</body>
  </html>
);

export const metadata: Metadata = {
  title: "pickai",
  description: "The models.dev catalog, one row per model identity.",
};

export default RootLayout;
