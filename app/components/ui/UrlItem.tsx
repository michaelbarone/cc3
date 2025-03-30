import { Url } from "@/app/lib/types";
import { Badge, Box, Button, Theme, Tooltip } from "@mui/material";

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

export function UrlItem({
  url,
  isActive,
  isLoaded,
  tooltipText,
  onUrlClick,
  onLongPress,
  menuPosition,
  theme,
}: UrlItemProps) {
  const commonIconStyles = {
    width: 24,
    height: 24,
    objectFit: "contain" as const,
  };

  const commonBadgeStyles = {
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
  };

  const commonBoxStyles = {
    position: "relative" as const,
    display: "flex",
    alignItems: "center",
  };

  return (
    <Tooltip title={tooltipText} placement={menuPosition === "side" ? "right" : "bottom"}>
      <Button
        onClick={onUrlClick}
        onContextMenu={(e) => {
          e.preventDefault();
          onLongPress();
        }}
        sx={{
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
        }}
      >
        <Box sx={commonBoxStyles}>
          {url.iconPath ? (
            <Box component="img" src={url.iconPath} alt={url.title} sx={commonIconStyles} />
          ) : (
            url.title
          )}
          {isLoaded && (
            <Badge color="success" variant="dot" overlap="circular" sx={commonBadgeStyles} />
          )}
        </Box>
      </Button>
    </Tooltip>
  );
}
