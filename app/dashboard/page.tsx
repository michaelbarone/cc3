'use client';

import { useAuth } from '@/app/lib/auth/auth-context';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CircularProgress, Box, Snackbar, Alert } from '@mui/material';
import AppLayout from '@/app/components/layout/AppLayout';
import MenuBar from '@/app/components/ui/MenuBar';
import IframeContainer, { IframeContainerRef } from '@/app/components/iframe/IframeContainer';
import { Url, UrlGroup } from '@/app/lib/types';
import { useUserPreferences } from '@/app/lib/hooks/useUserPreferences';

interface NotificationState {
  open: boolean;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error';
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const iframeContainerRef = useRef<IframeContainerRef | null>(null);
  const { preferences, loading: preferencesLoading } = useUserPreferences();

  const [urlGroups, setUrlGroups] = useState<UrlGroup[]>([]);
  const [activeUrlId, setActiveUrlId] = useState<string | null>(null);
  const [activeUrl, setActiveUrl] = useState<Url | null>(null);
  const [loadedUrlIds, setLoadedUrlIds] = useState<string[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [notification, setNotification] = useState<NotificationState>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Combined loading state - true if any loading is happening
  const isLoading = authLoading || preferencesLoading || dataLoading;

  // Get URL ID from query parameter
  const urlIdFromQuery = searchParams.get('url');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, router, user]);

  // Fetch URL groups for the user
  useEffect(() => {
    const fetchUrlGroups = async () => {
      if (!user) return;

      try {
        setDataLoading(true);

        // Fetch URL groups from the API
        const response = await fetch('/api/url-groups');

        if (!response.ok) {
          throw new Error('Failed to fetch URL groups');
        }

        const data = await response.json();
        const fetchedGroups = data.urlGroups || [];

        setUrlGroups(fetchedGroups);

        // First priority: URL from browser query parameter
        if (urlIdFromQuery) {
          let foundUrl: Url | null = null;

          // Find the URL in the groups
          for (const group of fetchedGroups) {
            const url = group.urls.find((u: Url) => u.id === urlIdFromQuery);
            if (url) {
              foundUrl = url;
              break;
            }
          }

          if (foundUrl) {
            setActiveUrlId(foundUrl.id);
            setActiveUrl(foundUrl);

            // Update last active URL in server
            updateLastActiveUrl(foundUrl.id);
          } else {
            // If URL from query not found, fall back to last active URL
            handleLastActiveUrlFallback(fetchedGroups);
          }
        } else {
          // Second priority: Last active URL from user preferences
          handleLastActiveUrlFallback(fetchedGroups);
        }

        setDataLoading(false);
      } catch (error) {
        console.error('Error fetching URL groups:', error);
        setNotification({
          open: true,
          message: 'Failed to load URL groups. Please try again.',
          severity: 'error'
        });
        setDataLoading(false);
      }
    };

    fetchUrlGroups();
  }, [user, urlIdFromQuery]);

  // Helper function to handle last active URL fallback
  const handleLastActiveUrlFallback = (fetchedGroups: UrlGroup[]) => {
    if (user?.lastActiveUrl) {
      const urlId = user.lastActiveUrl;

      // Find the URL in the groups
      for (const group of fetchedGroups) {
        const url = group.urls.find((u: Url) => u.id === urlId);
        if (url) {
          setActiveUrlId(url.id);
          setActiveUrl(url);

          // Update URL in browser without refreshing the page
          updateBrowserUrl(url.id);
          return;
        }
      }
    }

    // If no last active URL or not found, set the first URL as active
    if (fetchedGroups.length > 0 && fetchedGroups[0].urls.length > 0) {
      const firstUrl = fetchedGroups[0].urls[0];
      setActiveUrlId(firstUrl.id);
      setActiveUrl(firstUrl);

      // Save this as the last active URL
      updateLastActiveUrl(firstUrl.id);

      // Update URL in browser
      updateBrowserUrl(firstUrl.id);
    }
  };

  // Update browser URL with current active URL ID without refreshing the page
  const updateBrowserUrl = (urlId: string) => {
    // Create new URL with updated query parameter
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('url', urlId);

    // Update browser history without refreshing the page
    window.history.pushState({}, '', newUrl.toString());
  };

  // Update loaded URL IDs when iframe container reports load status
  useEffect(() => {
    // This will poll for loaded iframe IDs every second
    const interval = setInterval(() => {
      if (iframeContainerRef.current) {
        const ids = iframeContainerRef.current.getLoadedUrlIds();

        // Only update state if the loaded URLs have actually changed
        // This prevents unnecessary renders that could trigger iframe reloads
        setLoadedUrlIds(prev => {
          // Quick check if arrays are same length
          if (prev.length !== ids.length) {
            return ids;
          }

          // Check if arrays have same elements
          const prevSorted = [...prev].sort();
          const idsSorted = [...ids].sort();

          for (let i = 0; i < prevSorted.length; i++) {
            if (prevSorted[i] !== idsSorted[i]) {
              return ids;
            }
          }

          // If we get here, arrays are identical so keep previous state reference
          return prev;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Listen for browser navigation events (back/forward buttons)
  useEffect(() => {
    const handlePopState = () => {
      // Get URL ID from current URL after browser navigation
      const url = new URL(window.location.href);
      const urlId = url.searchParams.get('url');

      if (urlId && urlId !== activeUrlId) {
        // Find the URL object
        for (const group of urlGroups) {
          const url = group.urls.find(u => u.id === urlId);
          if (url) {
            setActiveUrlId(url.id);
            setActiveUrl(url);
            break;
          }
        }
      }
    };

    // Add event listener for browser navigation
    window.addEventListener('popstate', handlePopState);

    // Clean up
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [activeUrlId, urlGroups]);

  // Handle URL click
  const handleUrlClick = (url: Url) => {
    const isActive = activeUrlId === url.id;
    const isLoaded = loadedUrlIds.includes(url.id);

    // Four cases to handle:
    // 1. URL is active and loaded - optional reload
    // 2. URL is active but unloaded - reload it
    // 3. URL is not active but loaded - just switch to it without reloading
    // 4. URL is not active and not loaded - make it active and ensure it loads

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
      // Update state
      setActiveUrlId(url.id);
      setActiveUrl(url);

      // Update browser URL without refreshing the page
      updateBrowserUrl(url.id);

      // Save last active URL in user preferences via API
      updateLastActiveUrl(url.id);

      // Check if the iframe needs to be loaded (was previously unloaded)
      if (!isLoaded && iframeContainerRef.current) {
        setNotification({
          open: true,
          message: `Loading ${url.title}...`,
          severity: 'info'
        });

        // Force a reload of the unloaded iframe
        iframeContainerRef.current.reloadUnloadedIframe(url.id);
      } else if (isLoaded) {
        // Already loaded, just switched to it
        setNotification({
          open: true,
          message: `Switched to ${url.title}`,
          severity: 'success'
        });
      }
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

  // Handle long press on unloaded url
  const handleUrlLongPressUnloaded = (url: Url) => {
    setNotification({
      open: true,
      message: `Navigation to ${url.title} was prevented by long press`,
      severity: 'info'
    });
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

  // For debugging
  console.log('Dashboard using menu position:', preferences.menuPosition);

  return (
    <AppLayout
      menuContent={
        <MenuBar
          urlGroups={urlGroups}
          activeUrlId={activeUrlId}
          loadedUrlIds={loadedUrlIds}
          onUrlClick={handleUrlClick}
          onUrlReload={handleUrlReload}
          onUrlUnload={handleUrlUnload}
          onUrlLongPressUnloaded={handleUrlLongPressUnloaded}
          menuPosition={preferences.menuPosition}
        />
      }
    >
      {/* Main content */}
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <CircularProgress />
        </Box>
      ) : (
        <IframeContainer
          ref={iframeContainerRef}
          activeUrlId={activeUrlId}
          activeUrl={activeUrl}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          onUnload={handleIframeUnload}
          urlGroups={urlGroups}
        />
      )}

      {/* Notification snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
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
    </AppLayout>
  );
}
