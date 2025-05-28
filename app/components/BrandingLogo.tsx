"use client";

import { Box, SxProps, Theme, Typography } from "@mui/material";
import { useBranding } from "./BrandingProvider";

interface BrandingLogoProps {
  sx?: SxProps<Theme>;
  showTitle?: boolean;
  titleVariant?: "h6" | "subtitle1" | "subtitle2";
}

/**
 * BrandingLogo Component
 *
 * Displays the application logo with an optional title
 * Falls back to the application name if no logo is available
 */
export default function BrandingLogo({
  sx,
  showTitle = false,
  titleVariant = "h6",
}: BrandingLogoProps) {
  const { appName, logoPath, isLoading } = useBranding();

  return (
    <Box sx={{ display: "flex", alignItems: "center", ...sx }}>
      {logoPath ? (
        <Box
          component="img"
          src={logoPath}
          alt={appName}
          sx={{
            height: 40,
            maxWidth: 150,
            objectFit: "contain",
            mr: showTitle ? 2 : 0,
          }}
        />
      ) : (
        !showTitle && (
          <Typography variant={titleVariant} component="h1" sx={{ fontWeight: "bold" }}>
            {appName}
          </Typography>
        )
      )}

      {showTitle && (
        <Typography variant={titleVariant} component="h1">
          {appName}
        </Typography>
      )}
    </Box>
  );
}
