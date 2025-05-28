import {
  COMMON_TYPOGRAPHY,
  COMPONENT_STYLES,
  THEME_OPTIONS,
  THEME_PALETTE,
} from "@/app/lib/utils/constants";
import { createTheme, ThemeOptions } from "@mui/material/styles";

// Define common theme options for both light and dark modes
const commonThemeOptions: ThemeOptions = {
  typography: {
    fontFamily: COMMON_TYPOGRAPHY.FONT_FAMILY,
    h1: {
      fontSize: COMMON_TYPOGRAPHY.HEADING_SIZES.H1,
      fontWeight: COMMON_TYPOGRAPHY.HEADING_WEIGHT,
    },
    h2: {
      fontSize: COMMON_TYPOGRAPHY.HEADING_SIZES.H2,
      fontWeight: COMMON_TYPOGRAPHY.HEADING_WEIGHT,
    },
    h3: {
      fontSize: COMMON_TYPOGRAPHY.HEADING_SIZES.H3,
      fontWeight: COMMON_TYPOGRAPHY.HEADING_WEIGHT,
    },
    h4: {
      fontSize: COMMON_TYPOGRAPHY.HEADING_SIZES.H4,
      fontWeight: COMMON_TYPOGRAPHY.HEADING_WEIGHT,
    },
    h5: {
      fontSize: COMMON_TYPOGRAPHY.HEADING_SIZES.H5,
      fontWeight: COMMON_TYPOGRAPHY.HEADING_WEIGHT,
    },
    h6: {
      fontSize: COMMON_TYPOGRAPHY.HEADING_SIZES.H6,
      fontWeight: COMMON_TYPOGRAPHY.HEADING_WEIGHT,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: COMPONENT_STYLES.BUTTON.BORDER_RADIUS,
          textTransform: COMPONENT_STYLES.BUTTON.TEXT_TRANSFORM,
        } as const,
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: "none", // Remove the paper overlay gradient
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none", // Remove the paper overlay gradient
        },
      },
    },
  },
};

// Light theme options
const lightThemeOptions: ThemeOptions = {
  ...commonThemeOptions,
  palette: {
    mode: THEME_OPTIONS.LIGHT,
    primary: {
      main: THEME_PALETTE.LIGHT.PRIMARY,
      light: THEME_PALETTE.LIGHT.LIGHT,
      dark: THEME_PALETTE.LIGHT.DARK,
    },
    secondary: {
      main: THEME_PALETTE.LIGHT.SECONDARY.MAIN,
      light: THEME_PALETTE.LIGHT.SECONDARY.LIGHT,
      dark: THEME_PALETTE.LIGHT.SECONDARY.DARK,
    },
    background: {
      default: THEME_PALETTE.LIGHT.BACKGROUND,
      paper: THEME_PALETTE.LIGHT.PAPER,
    },
  },
};

// Dark theme options
const darkThemeOptions: ThemeOptions = {
  ...commonThemeOptions,
  palette: {
    mode: THEME_OPTIONS.DARK,
    primary: {
      main: THEME_PALETTE.DARK.PRIMARY,
      light: THEME_PALETTE.DARK.LIGHT,
      dark: THEME_PALETTE.DARK.DARK,
    },
    secondary: {
      main: THEME_PALETTE.DARK.SECONDARY.MAIN,
      light: THEME_PALETTE.DARK.SECONDARY.LIGHT,
      dark: THEME_PALETTE.DARK.SECONDARY.DARK,
    },
    background: {
      default: THEME_PALETTE.DARK.BACKGROUND,
      paper: THEME_PALETTE.DARK.PAPER,
    },
  },
};

// Create and export the light and dark themes
export const lightTheme = createTheme(lightThemeOptions);
export const darkTheme = createTheme(darkThemeOptions);
