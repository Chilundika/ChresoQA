import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "CampusQA — Event Registration",
  description: "Register for campus events: Orientations, Tutorials, and Live Q&As. Built for students, powered by modern tech.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {/* Atmospheric Liquid Blobs */}
        <div className="liquid-blob liquid-blob-1" aria-hidden="true" />
        <div className="liquid-blob liquid-blob-2" aria-hidden="true" />

        <Navbar />
        <main className="min-h-screen relative" style={{ zIndex: 1 }}>
          {children}
        </main>
      </body>
    </html>
  );
}
