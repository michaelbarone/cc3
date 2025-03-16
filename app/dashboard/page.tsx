'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CircularProgress, Box } from '@mui/material';
import AppLayout from '@/app/components/layout/AppLayout';
import MenuBar from '@/app/components/ui/MenuBar';
import IframeContainer from '@/app/components/iframe/IframeContainer';
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

  const [urlGroups, setUrlGroups] = useState<UrlGroup[]>([]);
  const [activeUrlId, setActiveUrlId] = useState<string | null>(null);
  const [activeUrl, setActiveUrl] = useState<Url | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        // In a real app, this would be an API call
        // For now, using mock data
        const mockData: UrlGroup[] = [
          {
            id: '1',
            name: 'Development Resources',
            description: 'Useful development tools',
            urls: [
              {
                id: '101',
                title: 'GitHub',
                url: 'https://github.com',
                displayOrder: 1
              },
              {
                id: '102',
                title: 'Stack Overflow',
                url: 'https://stackoverflow.com',
                displayOrder: 2
              }
            ]
          },
          {
            id: '2',
            name: 'Documentation',
            description: 'Reference docs',
            urls: [
              {
                id: '201',
                title: 'MDN Web Docs',
                url: 'https://developer.mozilla.org',
                displayOrder: 1
              },
              {
                id: '202',
                title: 'React Docs',
                url: 'https://reactjs.org/docs/getting-started.html',
                displayOrder: 2
              }
            ]
          }
        ];

        setUrlGroups(mockData);

        // Set active URL from user's last active URL if available
        if (user.lastActiveUrl) {
          const urlId = user.lastActiveUrl;

          // Find the URL in the groups
          for (const group of mockData) {
            const url = group.urls.find(url => url.id === urlId);
            if (url) {
              setActiveUrlId(url.id);
              setActiveUrl(url);
              break;
            }
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching URL groups:', error);
        setIsLoading(false);
      }
    };

    fetchUrlGroups();
  }, [user]);

  // Handle URL click
  const handleUrlClick = (url: Url) => {
    setActiveUrlId(url.id);
    setActiveUrl(url);

    // Save last active URL in user preferences
    // In a real app, this would be an API call
    console.log('Updating last active URL to:', url.id);
  };

  // Handle long press to reset iframe
  const handleLongPress = (url: Url) => {
    if (activeUrlId === url.id) {
      console.log('Resetting iframe for:', url.title);
      // The actual reset happens in the IframeContainer component
      // Here we could trigger an event or use a ref method to reset
    }
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
    <AppLayout
      menuContent={
        <MenuBar
          urlGroups={urlGroups}
          activeUrlId={activeUrlId}
          onUrlClick={handleUrlClick}
          onLongPress={handleLongPress}
        />
      }
    >
      <IframeContainer
        activeUrlId={activeUrlId}
        activeUrl={activeUrl}
        onLoad={(urlId) => console.log('Iframe loaded:', urlId)}
        onError={(urlId, error) => console.error('Iframe error:', urlId, error)}
      />
    </AppLayout>
  );
}
