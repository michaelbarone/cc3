"use client";

import { useAuth } from "@/app/lib/auth/auth-context";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircularProgress, Box, Snackbar } from "@mui/material";
import AppLayout from "@/app/components/layout/AppLayout";

// Comment out the direct import of MenuBar
// import MenuBar from '@/app/components/ui/MenuBar';
import IframeContainer from "@/app/components/iframe/IframeContainer";

// Import our new components
import { IframeProvider } from "@/app/components/iframe/state/IframeContext";
import { MenuBarAdapter } from "@/app/components/iframe/MenuBarAdapter";

import { Url, UrlGroup } from "@/app/lib/types";

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [urlGroups, setUrlGroups] = useState<UrlGroup[]>([]);
  const [activeUrlId, setActiveUrlId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<{ menuPosition: "side" | "top" }>({
    menuPosition: "side",
  });
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity?: "error" | "warning" | "info" | "success";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  // Other helper functions and event handlers that we'll still need
  const handleNotificationClose = () => {
    setNotification({
      ...notification,
      open: false,
    });
  };

  // Update browser URL without page refresh
  const updateBrowserUrl = (urlId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("url", urlId);
    window.history.pushState({}, "", url.toString());
  };

  // Load URL groups and set initial active URL
  useEffect(() => {
    const fetchUrlGroups = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/url-groups");
        if (!response.ok) {
          throw new Error(`Error fetching URL groups: ${response.status}`);
        }

        const data = await response.json();
        setUrlGroups(data.urlGroups || []);

        // Find the active URL from URL parameter or user's last active URL
        let urlIdToActivate = searchParams.get("url") || user?.lastActiveUrl || null;

        // If no URL is specified, use the first URL from the first group if available
        if (!urlIdToActivate && data.urlGroups?.length > 0 && data.urlGroups[0].urls.length > 0) {
          urlIdToActivate = data.urlGroups[0].urls[0].id;
        }

        if (urlIdToActivate) {
          setActiveUrlId(urlIdToActivate);

          // Find the URL object to set as active
          if (data.urlGroups) {
            for (const group of data.urlGroups) {
              const foundUrl = group.urls.find((url: Url) => url.id === urlIdToActivate);
              if (foundUrl) {
                // Update browser URL
                updateBrowserUrl(urlIdToActivate);
                break;
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching URL groups:", error);
        setNotification({
          open: true,
          message: "Failed to load URL groups",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    // Load user preferences
    const fetchUserPreferences = async () => {
      try {
        const response = await fetch("/api/users/preferences");
        if (response.ok) {
          const data = await response.json();
          setPreferences(data);
        }
      } catch (error) {
        console.error("Error fetching user preferences:", error);
      }
    };

    if (user) {
      fetchUrlGroups();
      fetchUserPreferences();
    } else {
      // Redirect to login if not authenticated
      router.push("/login");
    }
  }, [user, router, searchParams]);

  return (
    <IframeProvider activeUrlId={activeUrlId}>
      {loading ? (
        <Box
          sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <AppLayout
          menuContent={
            <MenuBarAdapter urlGroups={urlGroups} menuPosition={preferences.menuPosition} />
          }
        >
          <IframeContainer />
        </AppLayout>
      )}

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleNotificationClose}
        message={notification.message}
      />
    </IframeProvider>
  );
}
