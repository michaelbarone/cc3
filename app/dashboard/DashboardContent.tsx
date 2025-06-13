"use client";

import IframeContainer from "@/app/components/iframe/IframeContainer";
import AppLayout from "@/app/components/layout/AppLayout";
import { AppMenuContent } from "@/app/components/url-menu/AppMenuContent";
import { useAuth } from "@/app/lib/auth/auth-context";
import { useUrlGroups } from "@/app/lib/hooks/useUrlGroups";
import { IframeProvider } from "@/app/lib/state/iframe-state";
import { Box, CircularProgress, Snackbar } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { urlGroups, isLoading: urlGroupsLoading } = useUrlGroups();
  const [loading, setLoading] = useState(true);
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
    const initialize = async () => {
      try {
        // Check for URL parameter
        const urlParam = searchParams?.get("url");
        if (urlParam) {
          updateBrowserUrl(urlParam);
        }
        // Set loading to false - our AppMenuContent will handle its own loading state
        setLoading(false);
      } catch (error) {
        console.error("Error initializing dashboard:", error);
        setNotification({
          open: true,
          message: "Failed to initialize dashboard",
          severity: "error",
        });
        setLoading(false);
      }
    };

    if (user) {
      initialize();
    } else {
      // Redirect to login if not authenticated
      router.push("/login");
    }
  }, [user, router, searchParams]);

  return (
    <IframeProvider>
      {loading || urlGroupsLoading ? (
        <Box
          sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <AppLayout menuContent={<AppMenuContent />}>
          <Box sx={{ width: "100%", height: "100%" }}>
            <IframeContainer urlGroups={urlGroups || []} />
          </Box>
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
