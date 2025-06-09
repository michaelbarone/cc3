"use client";

import { useEffect, useState } from "react";

interface BrandingHeadProps {
  defaultTitle?: string;
}

interface BrandingSettings {
  appName: string;
  faviconPath: string | null;
}

/**
 * BrandingHead Component
 *
 * This component fetches branding settings from the server and
 * dynamically applies them to the document head.
 */
export default function BrandingHead({ defaultTitle = "ControlCenter" }: BrandingHeadProps) {
  const [settings, setSettings] = useState<BrandingSettings>({
    appName: defaultTitle,
    faviconPath: null,
  });

  useEffect(() => {
    // Fetch branding settings
    const fetchSettings = async () => {
      try {
        const response = await fetch("/api/admin/settings");

        // Handle authentication/authorization issues quietly
        if (response.status === 401 || response.status === 403) {
          // Just use defaults for unauthenticated/unauthorized users
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch branding settings: ${response.status}`);
        }

        const data = await response.json();

        setSettings({
          appName: data.settings.appName || defaultTitle,
          faviconPath: data.settings.faviconPath || null,
        });

        // Update document title
        if (data.settings.appName) {
          document.title = data.settings.appName;
        }
      } catch (error) {
        console.error("Error fetching branding settings:", error);
      }
    };

    fetchSettings();
  }, [defaultTitle]);

  // Use next/head to update document head
  return (
    <>
      <title>{settings.appName}</title>
      {settings.faviconPath && (
        <>
          <link rel="icon" href={settings.faviconPath} />
          <link rel="apple-touch-icon" href={settings.faviconPath} />
        </>
      )}
    </>
  );
}
