import { Box, CircularProgress } from "@mui/material";
import { Suspense } from "react";
import DashboardContent from "./DashboardContent";

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <Box
          sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}
        >
          <CircularProgress />
        </Box>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
