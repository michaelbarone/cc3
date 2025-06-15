import { getPrismaClient } from "@/app/lib/db/provider";
import { SelectedGroupProvider } from "@/app/lib/state/selected-group-context";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import React from "react";
import "./globals.css";
import { AuthProvider } from "./lib/auth/auth-context";
import { Providers } from "./providers";
import { ThemeProvider } from "./theme/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Define the AppConfig type based on the Prisma schema
type AppConfig = {
  id: string;
  appName: string;
  appLogo: string | null;
  favicon: string | null;
  loginTheme: string;
  registrationEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Default configuration for build-time or when database is unavailable
const defaultAppConfig: AppConfig = {
  id: "app-config",
  appName: "Control Center",
  appLogo: null,
  favicon: null,
  loginTheme: "dark",
  registrationEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function getAppConfig(): Promise<AppConfig> {
  try {
    const prisma = await getPrismaClient();
    const config = await prisma.appConfig.findUnique({
      where: { id: "app-config" },
    });
    return config || defaultAppConfig;
  } catch (error) {
    console.error("Failed to fetch app config:", error);
    return defaultAppConfig;
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export async function generateMetadata(): Promise<Metadata> {
  const appConfig = await getAppConfig();

  return {
    title: {
      template: `%s | ${appConfig.appName}`,
      default: appConfig.appName,
    },
    description: "A dashboard for managing and displaying URLs in iframes",
    icons: {
      apple: [
        { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
        { url: "/icon-lowrez-58.png", sizes: "58x58", type: "image/png" },
      ],
      icon: [
        { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
        { url: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
        { url: "/icon-lowrez-58.png", sizes: "58x58", type: "image/png" },
        { url: "/startup-image-320x460.png", sizes: "320x460", type: "image/png" },
      ],
    },
    // manifest: "/site.webmanifest",
    other: {
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-capable": "yes",
      "apple-mobile-web-app-title": appConfig.appName,
      "apple-touch-startup-image": "/startup-image-320x460.png",
      "theme-color": "#3B7FB7",
      "apple-mobile-web-app-status-bar-style": "black-translucent",
      "format-detection": "telephone=no",
      "apple-touch-fullscreen": "yes",
      "apple-mobile-web-app-orientations": "portrait",
    } as Record<string, string>,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Providers>
          <AuthProvider>
            <ThemeProvider>
              <SelectedGroupProvider>{children}</SelectedGroupProvider>
            </ThemeProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
