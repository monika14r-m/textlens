import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TextLens — Free AI & Plagiarism Checker",
  description: "Open-source AI content and similarity detection.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  );
}
