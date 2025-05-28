import { SessionProvider } from "@/app/providers/SessionProvider";
import { ThemeProvider } from "@/app/theme/ThemeProvider";
import type { Metadata } from "next";
import React from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ControlCenter",
  description: "A centralized dashboard for managing application URLs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
