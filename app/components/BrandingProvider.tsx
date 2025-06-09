"use client";

import { ReactNode, createContext, useContext, useEffect, useState } from "react";

interface BrandingContextType {
  appName: string;
  logoPath: string | null;
  isLoading: boolean;
}

const BrandingContext = createContext<BrandingContextType>({
  appName: "ControlCenter",
  logoPath: null,
  isLoading: true,
});

export const useBranding = () => useContext(BrandingContext);

interface BrandingProviderProps {
  children: ReactNode;
  defaultTitle?: string;
}

/**
 * BrandingProvider Component
 *
 * This component provides branding settings to the application via context.
 * It fetches branding settings from the server and makes them available to all components.
 */
export default function BrandingProvider({
  children,
  defaultTitle = "ControlCenter",
}: BrandingProviderProps) {
  const [branding, setBranding] = useState<BrandingContextType>({
    appName: defaultTitle,
    logoPath: null,
    isLoading: true,
  });

  useEffect(() => {
    // Fetch branding settings
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/admin/settings");

        // Handle authentication/authorization issues quietly
        if (response.status === 401 || response.status === 403) {
          // Just use defaults for unauthenticated/unauthorized users
          setBranding((prev) => ({ ...prev, isLoading: false }));
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch branding settings: ${response.status}`);
        }

        const data = await response.json();

        setBranding({
          appName: data.settings.appName || defaultTitle,
          logoPath: data.settings.logoPath || null,
          isLoading: false,
        });
      } catch (error) {
        console.error("Error fetching branding settings:", error);
        setBranding((prev) => ({ ...prev, isLoading: false }));
      }
    };

    fetchSettings();
  }, [defaultTitle]);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}
