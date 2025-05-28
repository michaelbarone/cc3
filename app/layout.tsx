import AppProviders from "@/app/providers";
import type { Metadata } from "next";
import React from "react";
import "./globals.css";

// Default metadata - this will be overridden by dynamic branding
export const metadata: Metadata = {
  title: "ControlCenter",
  description: "A centralized dashboard for managing application URLs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
