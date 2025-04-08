import { alpha, Box, LinearProgress, useTheme } from "@mui/material";

interface LongPressProgressProps {
  progress: number;
  isActive: boolean;
}

export function LongPressProgress({ progress, isActive }: LongPressProgressProps) {
  const theme = useTheme();

  if (!isActive) return null;

  const progressColor = alpha(theme.palette.warning.main, 0.7);

  return (
    <Box
      sx={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 2,
        overflow: "hidden",
        zIndex: 1,
      }}
    >
      <LinearProgress
        variant="determinate"
        value={progress < 25 ? 0 : progress}
        sx={{
          height: "100%",
          backgroundColor: "transparent",
          "& .MuiLinearProgress-bar": {
            backgroundColor: progressColor,
            transition: "none", // Remove default transition for smoother updates
          },
        }}
      />
    </Box>
  );
}
