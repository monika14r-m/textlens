import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TextLens — Document analysis, made clearer",
  description: "Upload your project, inspect writing signals, compare text overlap, and improve clarity with TextLens.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
