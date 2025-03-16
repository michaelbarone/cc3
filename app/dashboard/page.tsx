'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CircularProgress, Box, Snackbar, Alert } from '@mui/material';
import AppLayout from '@/app/components/layout/AppLayout';
import MenuBar from '@/app/components/ui/MenuBar';
import IframeContainer, { IframeContainerRef } from '@/app/components/iframe/IframeContainer';
import { useAuth } from '@/app/lib/auth/auth-context';

// Types for URLs and URL groups
interface Url {
  id: string;
  title: string;
  url: string;
  iconPath?: string;
  displayOrder: number;
}

interface UrlGroup {
  id: string;
  name: string;
  description?: string;
  urls: Url[];
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const iframeContainerRef = useRef<IframeContainerRef>(null);

  const [urlGroups, setUrlGroups] = useState<UrlGroup[]>([]);
  const [activeUrlId, setActiveUrlId] = useState<string | null>(null);
  const [activeUrl, setActiveUrl] = useState<Url | null>(null);
  const [loadedUrlIds, setLoadedUrlIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'info' | 'warning' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  // Fetch URL groups for the user
  useEffect(() => {
    const fetchUrlGroups = async () => {
      if (!user) return;

      try {
        setIsLoading(true);

        // Fetch URL groups from the API
        const response = await fetch('/api/url-groups');

        if (!response.ok) {
          throw new Error('Failed to fetch URL groups');
        }

        const data = await response.json();
        const fetchedGroups = data.urlGroups || [];

        setUrlGroups(fetchedGroups);

        // Set active URL from user's last active URL if available
        if (user.lastActiveUrl) {
          const urlId = user.lastActiveUrl;

          // Find the URL in the groups
          for (const group of fetchedGroups) {
            const url = group.urls.find((u: Url) => u.id === urlId);
            if (url) {
              setActiveUrlId(url.id);
              setActiveUrl(url);
              break;
            }
          }
        } else if (fetchedGroups.length > 0 && fetchedGroups[0].urls.length > 0) {
          // If no last active URL, set the first URL as active
          const firstUrl = fetchedGroups[0].urls[0];
          setActiveUrlId(firstUrl.id);
          setActiveUrl(firstUrl);

          // Save this as the last active URL
          updateLastActiveUrl(firstUrl.id);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching URL groups:', error);
        setNotification({
          open: true,
          message: 'Failed to load URL groups. Please try again.',
          severity: 'error'
        });
        setIsLoading(false);
      }
    };

    fetchUrlGroups();
  }, [user]);

  // Update loaded URL IDs when iframe container reports load status
  useEffect(() => {
    // This will poll for loaded iframe IDs every second
    const interval = setInterval(() => {
      if (iframeContainerRef.current) {
        const ids = iframeContainerRef.current.getLoadedUrlIds();
        setLoadedUrlIds(ids);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle URL click
  const handleUrlClick = (url: Url) => {
    const isActive = activeUrlId === url.id;
    const isLoaded = loadedUrlIds.includes(url.id);

    // Three cases to handle:
    // 1. URL is not active - make it active
    // 2. URL is active but unloaded - reload it
    // 3. URL is active and loaded - optional reload

    if (isActive) {
      if (!isLoaded) {
        // Active but not loaded (unloaded) - reload it
        setNotification({
          open: true,
          message: `Reloading ${url.title}...`,
          severity: 'info'
        });

        // Force a reload of the unloaded iframe
        if (iframeContainerRef.current) {
          iframeContainerRef.current.reloadUnloadedIframe(url.id);
        }
      } else {
        // Active and loaded - optional reload
        handleUrlReload(url);
      }
    } else {
      // Not active - make it active
      setActiveUrlId(url.id);
      setActiveUrl(url);

      // Save last active URL in user preferences via API
      updateLastActiveUrl(url.id);
    }
  };

  // Update last active URL in the backend
  const updateLastActiveUrl = async (urlId: string) => {
    try {
      const response = await fetch('/api/users/last-active-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urlId }),
      });

      if (!response.ok) {
        console.error('Failed to update last active URL');
      }
    } catch (error) {
      console.error('Error updating last active URL:', error);
    }
  };

  // Handle long press to unload iframe
  const handleUrlUnload = (url: Url) => {
    if (iframeContainerRef.current) {
      iframeContainerRef.current.unloadIframe(url.id);

      setNotification({
        open: true,
        message: `${url.title} has been unloaded to save resources`,
        severity: 'info'
      });
    }
  };

  // Handle reload active iframe
  const handleUrlReload = (url: Url) => {
    if (iframeContainerRef.current) {
      iframeContainerRef.current.resetIframe(url.id);

      setNotification({
        open: true,
        message: `Reloading ${url.title}...`,
        severity: 'info'
      });
    }
  };

  // Handle iframe load event
  const handleIframeLoad = (urlId: string) => {
    // Update loaded URLs list
    setLoadedUrlIds(prev => {
      if (!prev.includes(urlId)) {
        return [...prev, urlId];
      }
      return prev;
    });

    // Find URL title for notification
    const urlTitle = findUrlTitleById(urlId);
    if (urlTitle) {
      setNotification({
        open: true,
        message: `${urlTitle} loaded successfully`,
        severity: 'success'
      });
    }
  };

  // Handle iframe unload event
  const handleIframeUnload = (urlId: string) => {
    // Remove from loaded URLs list
    setLoadedUrlIds(prev => prev.filter(id => id !== urlId));
  };

  // Handle iframe error event
  const handleIframeError = (urlId: string, error: string) => {
    console.error('Iframe error:', urlId, error);

    // Remove from loaded URLs list
    setLoadedUrlIds(prev => prev.filter(id => id !== urlId));

    // Find URL title for notification
    const urlTitle = findUrlTitleById(urlId);
    if (urlTitle) {
      setNotification({
        open: true,
        message: `Failed to load ${urlTitle}: ${error}`,
        severity: 'error'
      });
    }
  };

  // Helper to find URL title by ID
  const findUrlTitleById = (urlId: string): string | null => {
    for (const group of urlGroups) {
      const url = group.urls.find(url => url.id === urlId);
      if (url) {
        return url.title;
      }
    }
    return null;
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification(prev => ({
      ...prev,
      open: false
    }));
  };

  // Show loading state
  if (loading || isLoading) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <AppLayout
        menuContent={
          <MenuBar
            urlGroups={urlGroups}
            activeUrlId={activeUrlId}
            loadedUrlIds={loadedUrlIds}
            onUrlClick={handleUrlClick}
            onUrlReload={handleUrlReload}
            onUrlUnload={handleUrlUnload}
          />
        }
      >
        <IframeContainer
          ref={iframeContainerRef}
          activeUrlId={activeUrlId}
          activeUrl={activeUrl}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          onUnload={handleIframeUnload}
        />
      </AppLayout>

      {/* Notification system */}
      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
}
