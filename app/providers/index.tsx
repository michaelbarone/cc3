"use client";

import BrandingHead from "@/app/components/BrandingHead";
import BrandingProvider from "@/app/components/BrandingProvider";
import { UserPreferencesProvider } from "@/app/contexts/UserPreferencesProvider";
import { ThemeProvider } from "@/app/theme/ThemeProvider";
import { ReactNode } from "react";
import { SessionProvider } from "./SessionProvider";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * AppProviders Component
 *
 * Combines all application providers in the correct order
 */
export default function AppProviders({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <UserPreferencesProvider>
        <BrandingProvider>
          <BrandingHead />
          <ThemeProvider>{children}</ThemeProvider>
        </BrandingProvider>
      </UserPreferencesProvider>
    </SessionProvider>
  );
}
