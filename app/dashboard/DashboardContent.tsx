"use client";

import IframeContainer from "@/app/components/iframe/IframeContainer";
import AppLayout from "@/app/components/layout/AppLayout";
import { AppMenuContent } from "@/app/components/url-menu/AppMenuContent";
import { useAuth } from "@/app/lib/auth/auth-context";
import { useLastActiveUrl } from "@/app/lib/hooks/useLastActiveUrl";
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
  const { lastActiveUrl, isLoading: lastActiveUrlLoading } = useLastActiveUrl();
  const [loading, setLoading] = useState(true);
  const [initialUrlId, setInitialUrlId] = useState<string | null>(null);
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
        // Priority:
        // 1. URL from query parameter (allows direct linking)
        // 2. Last active URL from user record
        // 3. First URL from first group

        // Check for URL parameter
        const urlParam = searchParams?.get("url");

        if (urlParam) {
          setInitialUrlId(urlParam);
          updateBrowserUrl(urlParam);
        } else if (lastActiveUrl) {
          // Verify that the last active URL still exists in the available URL groups
          const urlExists = urlGroups?.some((group) =>
            group.urls.some((url) => url.id === lastActiveUrl),
          );

          if (urlExists) {
            setInitialUrlId(lastActiveUrl);
            updateBrowserUrl(lastActiveUrl);
          } else {
            if (urlGroups && urlGroups.length > 0 && urlGroups[0].urls.length > 0) {
              const firstUrlId = urlGroups[0].urls[0].id;
              setInitialUrlId(firstUrlId);
              updateBrowserUrl(firstUrlId);
            }
          }
        } else if (urlGroups && urlGroups.length > 0 && urlGroups[0].urls.length > 0) {
          const firstUrlId = urlGroups[0].urls[0].id;
          setInitialUrlId(firstUrlId);
          updateBrowserUrl(firstUrlId);
        }

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

    if (user && !urlGroupsLoading && !lastActiveUrlLoading) {
      initialize();
    } else if (!user) {
      // Redirect to login if not authenticated
      router.push("/login");
    }
  }, [
    user,
    router,
    searchParams,
    urlGroups,
    urlGroupsLoading,
    lastActiveUrl,
    lastActiveUrlLoading,
  ]);

  return (
    <IframeProvider>
      {loading || urlGroupsLoading || lastActiveUrlLoading ? (
        <Box
          sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <AppLayout menuContent={<AppMenuContent initialUrlId={initialUrlId} />}>
          <Box sx={{ width: "100%", height: "100%" }}>
            <IframeContainer urlGroups={urlGroups || []} initialUrlId={initialUrlId || undefined} />
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
