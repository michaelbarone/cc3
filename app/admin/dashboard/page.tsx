"use client";

import {
  Alert,
  Box,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { format } from "date-fns";
import { useEffect, useState } from "react";

interface Statistics {
  system: {
    users: {
      total: number;
      active: number;
      withPassword: number;
      withoutPassword: number;
      adminRatio: {
        admin: number;
        regular: number;
      };
    };
    urlGroups: {
      total: number;
      unused: number;
      averageUrlsPerGroup: number;
    };
    urls: {
      total: number;
      withMobileVersion: number;
      desktopOnly: number;
      orphaned: number;
    };
  };
  userPreferences: {
    themeDistribution: Record<string, number>;
    menuPositionDistribution: Record<string, number>;
  };
  activity: {
    recentlyActive: Array<{
      username: string;
      lastActiveUrl: string;
      updatedAt: string;
    }>;
    mostAccessedUrls: Array<{
      url: string;
      count: number;
    }>;
  };
  urlGroups: {
    mostAssigned: Array<{
      name: string;
      userCount: number;
      urlCount: number;
    }>;
  };
}

export default function AdminStats() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const response = await fetch("/api/admin/statistics");
        if (!response.ok) {
          throw new Error("Failed to fetch statistics");
        }
        const data = await response.json();

        // Log the activity data to check date formats
        console.log(
          "Recent activity dates:",
          data.activity.recentlyActive.map((user: { username: string; updatedAt: string }) => ({
            username: user.username,
            updatedAt: user.updatedAt,
          })),
        );

        setStatistics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();

    // Update current time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Function to format time difference
  const formatTimeDiff = (dateStr: string) => {
    try {
      const date = new Date(dateStr);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn("Invalid date:", dateStr);
        return "Unknown time";
      }

      const diffInMinutes = Math.floor((currentTime.getTime() - date.getTime()) / (1000 * 60));

      if (diffInMinutes < 1) return "just now";
      if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;

      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours} hours ago`;

      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return `${diffInDays} days ago`;

      return format(date, "MMM d, yyyy");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Unknown time";
    }
  };

  if (loading) {
    return (
      <Grid container spacing={2} sx={{ p: 2 }}>
        {[...Array(6)].map((_, i) => (
          <Grid item xs={12} md={6} lg={4} key={i}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="60%" height={32} />
                <Skeleton variant="rectangular" height={100} sx={{ mt: 2 }} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!statistics) {
    return null;
  }

  return (
    <Grid container spacing={2} sx={{ p: 2 }}>
      {/* System Overview */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Overview
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" gutterBottom>
                  Users
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography>Total Users: {statistics.system.users.total}</Typography>
                  <Typography>Active Users: {statistics.system.users.active}</Typography>
                  <Typography>
                    Admin/Regular: {statistics.system.users.adminRatio.admin} /{" "}
                    {statistics.system.users.adminRatio.regular}
                  </Typography>
                  <Typography>
                    Password Protected: {statistics.system.users.withPassword}
                  </Typography>
                  <Typography>Passwordless: {statistics.system.users.withoutPassword}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" gutterBottom>
                  URL Groups
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography>Total Groups: {statistics.system.urlGroups.total}</Typography>
                  <Typography>Unused Groups: {statistics.system.urlGroups.unused}</Typography>
                  <Typography>
                    Average URLs per Group: {statistics.system.urlGroups.averageUrlsPerGroup}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" gutterBottom>
                  URLs
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Typography>Total URLs: {statistics.system.urls.total}</Typography>
                  <Typography>
                    Mobile URL Set: {statistics.system.urls.withMobileVersion}
                  </Typography>
                  <Typography>Desktop Only: {statistics.system.urls.desktopOnly}</Typography>
                  <Typography>Orphaned: {statistics.system.urls.orphaned}</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* User Preferences */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              User Preferences
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Theme Distribution
                </Typography>
                <Box sx={{ mt: 1 }}>
                  {Object.entries(statistics.userPreferences.themeDistribution).map(
                    ([theme, count]) => (
                      <Typography key={theme}>
                        {theme}: {count} users
                      </Typography>
                    ),
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Menu Position
                </Typography>
                <Box sx={{ mt: 1 }}>
                  {Object.entries(statistics.userPreferences.menuPositionDistribution).map(
                    ([position, count]) => (
                      <Typography key={position}>
                        {position}: {count} users
                      </Typography>
                    ),
                  )}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Activity */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Box sx={{ mt: 2, maxHeight: 300, overflow: "auto" }}>
              {statistics.activity.recentlyActive.map((user) => (
                <Box key={user.username} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">{user.username}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last URL: {user.lastActiveUrl}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatTimeDiff(user.updatedAt)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* URL Groups */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Most Active URL Groups
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell align="right">Users</TableCell>
                    <TableCell align="right">URLs</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statistics.urlGroups.mostAssigned.map((group) => (
                    <TableRow key={group.name}>
                      <TableCell>{group.name}</TableCell>
                      <TableCell align="right">{group.userCount}</TableCell>
                      <TableCell align="right">{group.urlCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Most Accessed URLs */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Most Accessed URLs
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>URL</TableCell>
                    <TableCell align="right">Access Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {statistics.activity.mostAccessedUrls.map((url) => (
                    <TableRow key={url.url}>
                      <TableCell>{url.url}</TableCell>
                      <TableCell align="right">{url.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
