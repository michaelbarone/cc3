import { Url } from "@/app/lib/types";
import { Badge, Box, Button, Theme, Tooltip } from "@mui/material";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  // Long press state
  const [pressProgress, setPressProgress] = useState(0);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const pressStartTime = useRef<number>(0);
  const LONG_PRESS_DURATION = 1000; // 00ms for long press

  const handlePressStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      pressStartTime.current = Date.now();
      setIsLongPressing(true);

      pressTimer.current = window.setInterval(() => {
        const elapsed = Date.now() - pressStartTime.current;
        const progress = Math.min((elapsed / LONG_PRESS_DURATION) * 100, 100);
        setPressProgress(progress);

        if (progress >= 100) {
          handlePressEnd();
          onLongPress();
        }
      }, 10);
    },
    [onLongPress],
  );

  const handlePressEnd = useCallback(() => {
    if (pressTimer.current !== null) {
      window.clearInterval(pressTimer.current);
      pressTimer.current = null;
    }
    setIsLongPressing(false);
    setPressProgress(0);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      // Only trigger click if we haven't started a long press
      // or if the long press didn't complete
      if (!isLongPressing || pressProgress < 100) {
        onUrlClick();
      }
    },
    [isLongPressing, pressProgress, onUrlClick],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pressTimer.current !== null) {
        window.clearInterval(pressTimer.current);
      }
    };
  }, []);

  const styles = useMemo(
    () => ({
      iconStyles: {
        width: 24,
        height: 24,
        objectFit: "contain" as const,
      },
      badgeStyles: {
        position: "absolute" as const,
        top: -2,
        right: -2,
        "& .MuiBadge-badge": {
          backgroundColor: theme.palette.success.main,
          width: 8,
          height: 8,
          minWidth: 8,
          borderRadius: "50%",
          opacity: 0.8,
        },
      },
      boxStyles: {
        position: "relative" as const,
        display: "flex",
        alignItems: "center",
      },
      buttonStyles: {
        mx: 0.5,
        textTransform: "none",
        borderBottom: isActive ? `2px solid ${theme.palette.primary.main}` : "none",
        borderRadius: 0,
        color: isActive ? theme.palette.primary.main : theme.palette.text.primary,
        fontWeight: isActive ? "bold" : "normal",
        backgroundColor: "transparent",
        position: "relative",
        overflow: "hidden",
        "&:hover": {
          opacity: 0.8,
        },
      },
    }),
    [theme.palette.primary.main, theme.palette.success.main, theme.palette.text.primary, isActive],
  );

  return (
    <Tooltip title={tooltipText} placement={menuPosition === "side" ? "right" : "bottom"}>
      <Button
        onClick={handleClick}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        sx={styles.buttonStyles}
      >
        <Box sx={styles.boxStyles}>
          {url.iconPath ? (
            <Box component="img" src={url.iconPath} alt={url.title} sx={styles.iconStyles} />
          ) : (
            url.title
          )}
          {isLoaded && (
            <Badge color="success" variant="dot" overlap="circular" sx={styles.badgeStyles} />
          )}
        </Box>
        <LongPressProgress progress={pressProgress} isActive={isLongPressing} />
      </Button>
    </Tooltip>
  );
});

export { UrlItem };
