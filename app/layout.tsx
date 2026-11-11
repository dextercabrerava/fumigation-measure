import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import { StoreProvider } from "@/lib/store";
import { Header } from "@/components/Header";
import "./globals.css";

const font = Space_Grotesk({ variable: "--font-space-grotesk", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fumigation Measure · Demo",
  description: "Structure measurement and cubic volume for structural fumigation. Demo with sample data.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#171717",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${font.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <StoreProvider>
          <Header />
          <main className="mx-auto w-full max-w-3xl px-4 pb-40 pt-5 sm:px-6">{children}</main>
        </StoreProvider>
      </body>
    </html>
  );
}
