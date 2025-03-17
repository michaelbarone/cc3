import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./theme/theme-provider";
import { AuthProvider } from "./lib/auth/auth-context";
import { Providers } from './providers';
import { getPrismaClient } from '@/lib/db/provider';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

async function getAppConfig() {
  const prisma = await getPrismaClient();
  return await prisma.appConfig.findUnique({
    where: { id: 'app-config' },
  });
}

export async function generateMetadata(): Promise<Metadata> {
  const appConfig = await getAppConfig();

  return {
    title: {
      template: `%s | ${appConfig?.appName || 'Control Center'}`,
      default: appConfig?.appName || 'Control Center',
    },
    description: "A dashboard for managing and displaying URLs in iframes",
    icons: appConfig?.favicon ? [{ rel: 'icon', url: appConfig.favicon }] : [],
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          <ThemeProvider>
            <Providers>
              {children}
            </Providers>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
