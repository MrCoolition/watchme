import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "WATCHMÉ — Your private watch studio", description: "Original timepieces. Exceptional details. A private collection, entirely your own.", robots: { index: false, follow: false }, applicationName: "WATCHMÉ" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#101110", colorScheme: "dark" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><a className="skip-link" href="#main-content">Skip to content</a>{children}</body></html>; }
