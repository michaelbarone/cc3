import { Box, LinearProgress, useTheme } from "@mui/material";

interface LongPressProgressProps {
  progress: number;
  isActive: boolean;
}

export function LongPressProgress({ progress, isActive }: LongPressProgressProps) {
  const theme = useTheme();

  if (!isActive) return null;

  // Using orange color as specified in requirements
  const progressColor = theme.palette.warning.main;

  return (
    <Box
      sx={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 3, // 3px thick as per requirements (2-3px)
        overflow: "hidden",
        zIndex: 1,
      }}
    >
      <LinearProgress
        variant="determinate"
        value={progress < 25 ? 0 : progress} // 0.3s delay implemented via threshold
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
