import { Url } from "@/app/lib/types";
import { getEffectiveUrl } from "@/app/lib/utils/iframe-utils";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Box,
  Button,
  ListItemButton,
  ListItemText,
  Theme,
  Tooltip,
  useMediaQuery,
} from "@mui/material";
import { memo, useMemo } from "react";

interface ExternalUrlItemProps {
  url: Url;
  tooltipText: string;
  menuPosition: "top" | "side";
  theme: Theme;
}

const ExternalUrlItem = memo(function ExternalUrlItem({
  url,
  tooltipText,
  menuPosition,
  theme,
}: ExternalUrlItemProps) {
  // Check if we're on mobile
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Simple click handler that opens the URL in a new tab
  const handleClick = () => {
    // Get the effective URL based on localhost settings and device
    const effectiveUrl = url.isLocalhost
      ? getEffectiveUrl(
          {
            id: url.id,
            url: url.url,
            urlMobile: url.urlMobile,
            isLocalhost: true,
            port: url.port || null,
            path: url.path || null,
            localhostMobilePath: url.localhostMobilePath || null,
            localhostMobilePort: url.localhostMobilePort || null,
          },
          isMobile,
        )
      : isMobile && url.urlMobile
        ? url.urlMobile
        : url.url;

    window.open(effectiveUrl, "_blank", "noopener,noreferrer");
  };

  // For top menu, use Button-based styling
  if (menuPosition === "top") {
    const styles = useMemo(
      () => ({
        iconStyles: {
          width: 24,
          height: 24,
          objectFit: "contain" as const,
          marginRight: url.title && url.iconPath ? 1 : 0,
        },
        boxStyles: {
          position: "relative" as const,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
        },
        buttonStyles: {
          height: 50, // Fixed height for consistency
          minHeight: 50, // Ensure minimum height is the same
          minWidth: 50,
          lineHeight: "36px", // Match line height to button height
          px: 0, // Slightly more horizontal padding
          mx: 0.5,
          textTransform: "none",
          borderRadius: 1,
          color: theme.palette.text.primary,
          fontWeight: "normal",
          backgroundColor: "transparent",
          position: "relative",
          overflow: "hidden",
          pb: 0,
          "&:hover": {
            opacity: 0.8,
          },
        },
        containerStyles: {
          display: "inline-block",
          position: "relative" as const,
        },
        externalIconStyles: {
          position: "relative" as const,
          marginLeft: 1,
          fontSize: 14,
          color: theme.palette.text.secondary,
          opacity: 0.7,
          padding: "1px",
        },
        titleStyles: {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.875rem",
          whiteSpace: "nowrap" as const,
          overflow: "hidden" as const,
          textOverflow: "ellipsis" as const,
          maxWidth: 100,
        },
      }),
      [theme.palette.text.primary, theme.palette.text.secondary, url.title, url.iconPath],
    );

    return (
      <Box sx={styles.containerStyles}>
        <Tooltip title={tooltipText} placement="bottom" enterDelay={700}>
          <Button
            onClick={handleClick}
            sx={styles.buttonStyles}
            disableRipple={false}
            aria-label={`${url.title} (opens in new tab)`}
          >
            <Box sx={styles.boxStyles}>
              {url.iconPath ? (
                <>
                  <Box component="img" src={url.iconPath} alt="" sx={styles.iconStyles} />
                  {url.title && <Box sx={styles.titleStyles}>{url.title}</Box>}
                </>
              ) : (
                <Box sx={styles.titleStyles}>{url.title}</Box>
              )}
              <OpenInNewIcon sx={styles.externalIconStyles} fontSize="small" />
            </Box>
          </Button>
        </Tooltip>
      </Box>
    );
  }

  // For side menu, use ListItemButton-based styling to match UrlItem
  return (
    <ListItemButton
      onClick={handleClick}
      sx={{
        pl: isMobile ? 3 : 4,
        position: "relative",
        borderRight: 0,
        display: "flex",
        alignItems: "center",
      }}
    >
      {url.iconPath && (
        <Box
          component="img"
          src={url.iconPath}
          alt=""
          sx={{
            width: 20,
            height: 20,
            objectFit: "contain",
            mr: 1.5,
            flexShrink: 0,
          }}
        />
      )}
      <ListItemText
        primary={url.title || url.url}
        secondary={url.url}
        primaryTypographyProps={{
          fontSize: isMobile ? "0.875rem" : "inherit", // Smaller font on mobile
        }}
        secondaryTypographyProps={{
          fontSize: isMobile ? "0.75rem" : "inherit", // Smaller font on mobile
        }}
      />
      <OpenInNewIcon
        sx={{
          ml: 1,
          fontSize: isMobile ? 12 : 14, // Smaller icon on mobile
          color: theme.palette.text.secondary,
          opacity: 0.7,
        }}
        fontSize="small"
      />
    </ListItemButton>
  );
});

export { ExternalUrlItem };
