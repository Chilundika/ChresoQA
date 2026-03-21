import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
      <body className="font-sans antialiased flex flex-col min-h-screen" suppressHydrationWarning>
        {/* Atmospheric Liquid Blobs */}
        <div className="liquid-blob liquid-blob-1" aria-hidden="true" />
        <div className="liquid-blob liquid-blob-2" aria-hidden="true" />

        <Navbar />
        <main className="flex-grow relative" style={{ zIndex: 1 }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
