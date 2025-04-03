import { Url } from "@/app/lib/types";
import { Badge, Box, Button, Theme, Tooltip } from "@mui/material";
import { memo, useMemo } from "react";

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
        onClick={(e) => {
          e.preventDefault();
          onUrlClick();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onLongPress();
        }}
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
      </Button>
    </Tooltip>
  );
});

export { UrlItem };
