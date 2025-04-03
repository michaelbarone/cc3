"use client";

import IframeContainer from "@/app/components/iframe/IframeContainer";
import { MenuBarAdapter } from "@/app/components/iframe/MenuBarAdapter";
import AppLayout from "@/app/components/layout/AppLayout";
import { useAuth } from "@/app/lib/auth/auth-context";
import { IframeProvider } from "@/app/lib/state/iframe-state";
import { UrlGroup } from "@/app/lib/types";
import { Box, CircularProgress, Snackbar } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [urlGroups, setUrlGroups] = useState<UrlGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState<{ menuPosition?: "side" | "top" }>({
    menuPosition: undefined,
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

  useEffect(() => {
    const fetchUrlGroups = async () => {
      try {
        const response = await fetch("/api/url-groups");
        if (!response.ok) {
          throw new Error("Failed to fetch URL groups");
        }
        const { urlGroups } = await response.json();
        setUrlGroups(urlGroups);

        // Check for URL parameter and set active URL
        const urlParam = searchParams?.get("url");
        if (urlParam) {
          updateBrowserUrl(urlParam);
        } else if (urlGroups.length > 0 && urlGroups[0].urls.length > 0) {
          // Set first URL as active if no URL parameter
          updateBrowserUrl(urlGroups[0].urls[0].id);
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

    const fetchUserPreferences = async () => {
      try {
        const response = await fetch("/api/user/preferences");
        if (!response.ok) {
          throw new Error("Failed to fetch user preferences");
        }
        const data = await response.json();
        setPreferences(data);
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
    <IframeProvider>
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
          <IframeContainer urlGroups={urlGroups} />
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
