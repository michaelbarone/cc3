'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Box, CircularProgress, Typography } from '@mui/material';

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to profile settings page since it's the first available settings page
    router.push('/settings/profile');
  }, [router]);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      <CircularProgress size={24} sx={{ mr: 2 }} />
      <Typography>Redirecting to settings...</Typography>
    </Box>
  );
}
