import { createTheme, ThemeOptions } from "@mui/material/styles";

// Define common theme settings
const themeOptions: ThemeOptions = {
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
          padding: "8px 16px",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.1)",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: "none",
        },
      },
    },
  },
};

// Light theme
export const lightTheme = createTheme({
  ...themeOptions,
  palette: {
    mode: "light",
    primary: {
      main: "#0070f3",
      light: "#42a5f5",
      dark: "#0059b2",
    },
    secondary: {
      main: "#19857b",
    },
    error: {
      main: "#d32f2f",
    },
    background: {
      default: "#f7f9fc",
      paper: "#ffffff",
    },
  },
});

// Dark theme
export const darkTheme = createTheme({
  ...themeOptions,
  palette: {
    mode: "dark",
    primary: {
      main: "#42a5f5",
      light: "#80d0ff",
      dark: "#0077c2",
    },
    secondary: {
      main: "#26a69a",
    },
    error: {
      main: "#ef5350",
    },
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
  },
});

// Function to get theme based on mode
export const getTheme = (mode: "light" | "dark" | "system") => {
  // System defaults to dark for now, in the real app we would check system preference
  return mode === "light" ? lightTheme : darkTheme;
};
