'use client';

import { useState, useEffect } from 'react';
import { Box, Grid, Paper, Typography, Card, CardHeader, CircularProgress } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import LinkIcon from '@mui/icons-material/Link';
import DashboardIcon from '@mui/icons-material/Dashboard';

interface Stats {
  totalUsers: number;
  totalUrlGroups: number;
  totalUrls: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/stats');

        if (!response.ok) {
          throw new Error('Failed to fetch admin stats');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error" variant="h6">
          Error: {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card elevation={2}>
            <CardHeader
              avatar={<PeopleIcon color="primary" fontSize="large" />}
              title={
                <Typography variant="h5">
                  {stats?.totalUsers || 0}
                </Typography>
              }
              subheader="Total Users"
            />
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card elevation={2}>
            <CardHeader
              avatar={<LinkIcon color="primary" fontSize="large" />}
              title={
                <Typography variant="h5">
                  {stats?.totalUrlGroups || 0}
                </Typography>
              }
              subheader="URL Groups"
            />
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card elevation={2}>
            <CardHeader
              avatar={<DashboardIcon color="primary" fontSize="large" />}
              title={
                <Typography variant="h5">
                  {stats?.totalUrls || 0}
                </Typography>
              }
              subheader="Total URLs"
            />
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Quick Actions
        </Typography>
        <Typography variant="body1">
          Use the sidebar to navigate to specific administration areas:
        </Typography>
        <ul>
          <li>
            <Typography variant="body1">
              User Management - Create, edit and delete user accounts
            </Typography>
          </li>
          <li>
            <Typography variant="body1">
              URL Groups - Manage URL groups and their content
            </Typography>
          </li>
        </ul>
      </Paper>
    </Box>
  );
}
