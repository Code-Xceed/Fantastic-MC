import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "FMC Gen — Free MC Account Generator",
  description:
    "Get free Minecraft alt accounts instantly. Login with Discord, generate accounts, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          <Navbar />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
            {children}
          </main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
