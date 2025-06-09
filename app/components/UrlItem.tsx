"use client";

import { useIframeManager } from "@/app/contexts/IframeProvider";
import { useLongPress } from "@/app/hooks/useLongPress";
import { Url } from "@/app/types/url";
import { Box, ListItemButton, ListItemText, Tooltip, useMediaQuery, useTheme } from "@mui/material";
import Image from "next/image";
import { useCallback, useMemo } from "react";

export interface UrlItemProps {
  url: Url;
  groupId?: string;
  onGroupChange?: (groupId: string) => void;
  isCompact?: boolean;
  onClick?: () => void;
  showTooltip?: boolean;
  testLongPress?: boolean;
}

/**
 * Reusable URL item component with click and long-press functionality
 */
export default function UrlItem({
  url,
  groupId,
  onGroupChange,
  isCompact = false,
  onClick,
  showTooltip = false,
}: UrlItemProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { activeUrlIdentifier, isUrlLoaded, setActiveUrl, markAsUnloaded, triggerReload } =
    useIframeManager();

  const isActive = activeUrlIdentifier === url.urlId;
  const isLoaded = isUrlLoaded(url.urlId);

  // Handle single-click
  const handleClick = useCallback(() => {
    // If the URL is not active or not loaded, activate it
    if (!isActive || !isLoaded) {
      setActiveUrl(url.urlId, url.url);
      if (groupId && onGroupChange) {
        onGroupChange(groupId);
      }
    } else {
      // If the URL is already active and loaded, reload it
      triggerReload(url.urlId);
    }

    // Trigger additional click handler if provided
    if (onClick) {
      onClick();
    }
  }, [
    url.urlId,
    url.url,
    isActive,
    isLoaded,
    setActiveUrl,
    triggerReload,
    groupId,
    onGroupChange,
    onClick,
  ]);

  // Handle long-press to unload content
  const handleLongPress = useCallback(() => {
    if (isLoaded) {
      markAsUnloaded(url.urlId);

      // Provide haptic feedback on mobile if available
      if (navigator.vibrate) {
        // Use a stronger vibration pattern for more noticeable feedback
        navigator.vibrate([100, 50, 100]);
      }
    }
  }, [url.urlId, isLoaded, markAsUnloaded]);

  // Set up long-press hook
  const { handlers, state } = useLongPress({
    onLongPress: handleLongPress,
    onClick: handleClick,
    // Provide long press feedback a bit earlier on mobile for better UX
    feedbackDelay: isMobile ? 200 : 300,
  });

  // Create progress indicator styles based on long-press state
  const progressStyles = useMemo(() => {
    if (!state.showFeedback) return {};

    return {
      position: "relative",
      "&::after": {
        content: '""',
        position: "absolute",
        bottom: 0,
        left: 0,
        height: isMobile ? "4px" : "3px", // Slightly thicker progress bar on mobile
        width: `${state.progress * 100}%`,
        backgroundColor: theme.palette.warning.main,
        transition: "width 0.1s linear",
      },
    };
  }, [state.showFeedback, state.progress, theme.palette.warning.main, isMobile]);

  // Create compact or normal rendering based on isCompact prop
  const content = isCompact ? (
    // Compact version (icon only)
    <Box
      sx={{
        width: 20,
        height: 20,
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {url.faviconUrl ? (
        <Image
          src={url.faviconUrl}
          alt=""
          width={20}
          height={20}
          style={{ objectFit: "contain" }}
          onError={(e) => {
            // Hide broken images
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <Box
          sx={{
            width: 20,
            height: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: theme.palette.grey[300],
            borderRadius: "4px",
            fontSize: "0.625rem",
            fontWeight: "bold",
          }}
        >
          {url.title.charAt(0)}
        </Box>
      )}
    </Box>
  ) : (
    // Full version (icon + text)
    <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
      {url.faviconUrl ? (
        <Box sx={{ mr: 1, width: 16, height: 16, position: "relative" }}>
          <Image
            src={url.faviconUrl}
            alt=""
            width={16}
            height={16}
            style={{ objectFit: "contain" }}
            onError={(e) => {
              // Hide broken images
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </Box>
      ) : null}
      <ListItemText
        primary={url.title}
        primaryTypographyProps={{
          noWrap: true,
          variant: "body2",
        }}
      />
    </Box>
  );

  // Add tooltip for compact view or when explicitly requested
  const itemContent =
    isCompact || showTooltip ? (
      <Tooltip title={url.title} placement="right">
        {/* We need a div here as Tooltip requires a DOM element as its child */}
        <div style={{ display: "contents" }}>{content}</div>
      </Tooltip>
    ) : (
      content
    );

  return (
    <ListItemButton
      {...handlers}
      sx={{
        px: isCompact ? 1 : 2,
        // Increase touch target size on mobile for better touch accessibility
        py: isMobile ? 1.5 : 1,
        minHeight: isMobile ? 56 : isCompact ? 40 : 48,
        justifyContent: isCompact ? "center" : "initial",
        opacity: isLoaded ? 1 : 0.5,
        // Use right border for mobile and desktop consistency
        borderRight: isActive ? `3px solid ${theme.palette.primary.main}` : "none",
        // Add subtle background color for active state
        bgcolor: isActive ? `${theme.palette.primary.main}10` : "transparent",
        // Add touch ripple effect on mobile for better feedback
        ...(isMobile && {
          transition: "background-color 0.2s ease",
          "&:active": {
            bgcolor: theme.palette.action.selected,
          },
        }),
        ...progressStyles,
      }}
      disableRipple={state.isPressed && state.showFeedback}
    >
      {itemContent}
    </ListItemButton>
  );
}
