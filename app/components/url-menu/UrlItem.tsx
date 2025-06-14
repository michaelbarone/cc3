import { useLongPress } from "@/app/lib/hooks/useLongPress";
import { Url } from "@/app/lib/types";
import { Box, Button, Theme, Tooltip } from "@mui/material";
import { memo, useMemo } from "react";
import { LongPressProgress } from "./LongPressProgress";

interface UrlItemProps {
  url: Url;
  isActive: boolean;
  isLoaded: boolean;
  tooltipText: string;
  onUrlClick: () => void;
  onLongPress: () => void;
  menuPosition: "top" | "side";
  theme: Theme;
}

const UrlItem = memo(function UrlItem({
  url,
  isActive,
  isLoaded,
  tooltipText,
  onUrlClick,
  onLongPress,
  menuPosition,
  theme,
}: UrlItemProps) {
  const {
    onMouseDown,
    onMouseUp,
    onMouseLeave,
    onTouchStart,
    onTouchEnd,
    progress,
    isLongPressing,
  } = useLongPress({
    onClick: onUrlClick,
    onLongPress,
    duration: 2000, // 2 seconds for long press
    disabled: false,
    visualFeedback: true,
  });

  const styles = useMemo(
    () => ({
      iconStyles: {
        width: 32,
        height: 32,
        objectFit: "contain" as const,
      },
      boxStyles: {
        position: "relative" as const,
        display: "flex",
        alignItems: "center",
        opacity: isLoaded ? 1.0 : 0.5, // Opacity 0.5 for unloaded, 1.0 for loaded
      },
      buttonStyles: {
        height: 50, // Fixed height for consistency
        minHeight: 50, // Ensure minimum height is the same
        minWidth: 50,
        lineHeight: "36px", // Match line height to button height
        px: 0, // Consistent horizontal padding
        mx: 0.5,
        textTransform: "none",
        // Position-specific active indicators
        ...(menuPosition === "top"
          ? {
              borderBottom: isActive
                ? `2px solid ${theme.palette.primary.main}`
                : "2px solid transparent",
              borderRight: "none",
              borderRadius: 0,
            }
          : {
              borderBottom: "none",
              borderRight: isActive ? `2px solid ${theme.palette.primary.main}` : "none",
              borderRadius: 0,
            }),
        color: theme.palette.text.primary,
        fontWeight: "normal", // Consistent font weight regardless of active state
        backgroundColor: "transparent",
        position: "relative",
        overflow: "hidden",
        // Use consistent padding to prevent layout shifts
        pb: 0,
        "&:hover": {
          opacity: 0.8,
        },
      },
      // Add explicit container styles to prevent unwanted event bubbling
      containerStyles: {
        display: "inline-block",
        position: "relative" as const,
      },
    }),
    [theme.palette.primary.main, theme.palette.text.primary, isActive, isLoaded, menuPosition],
  );

  return (
    <Box sx={styles.containerStyles}>
      <Tooltip
        title={tooltipText}
        placement={menuPosition === "side" ? "right" : "bottom"}
        enterDelay={700}
      >
        <Button
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          sx={styles.buttonStyles}
          disableRipple={false}
          aria-label={url.title}
        >
          <Box sx={styles.boxStyles}>
            {url.iconPath ? (
              <Box component="img" src={url.iconPath} alt={url.title} sx={styles.iconStyles} />
            ) : (
              url.title
            )}
          </Box>
          <LongPressProgress progress={progress} isActive={isLongPressing} />
        </Button>
      </Tooltip>
    </Box>
  );
});

export { UrlItem };
