/**
 * Application-wide constants
 *
 * This file contains constants that are used throughout the application.
 * Centralizing constants makes it easier to maintain and update them.
 */

// App configuration defaults
export interface AppConfig {
  appName: string;
  appLogo: string | null;
  loginTheme: string;
  registrationEnabled: boolean;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  appName: "Dashboard",
  appLogo: null,
  loginTheme: "dark",
  registrationEnabled: false,
};

// Theme constants
export const THEME_OPTIONS = {
  LIGHT: "light",
  DARK: "dark",
} as const;

export type ThemeMode = typeof THEME_OPTIONS.LIGHT | typeof THEME_OPTIONS.DARK;

// Theme palette constants
export const THEME_PALETTE = {
  DARK: {
    PRIMARY: "#90caf9",
    LIGHT: "#e3f2fd",
    DARK: "#42a5f5",
    BACKGROUND: "#121212",
    PAPER: "#1e1e1e",
    SECONDARY: {
      MAIN: "#f48fb1",
      LIGHT: "#f8bbd0",
      DARK: "#e91e63",
    },
  },
  LIGHT: {
    PRIMARY: "#1976d2",
    LIGHT: "#4791db",
    DARK: "#115293",
    BACKGROUND: "#f5f5f5",
    PAPER: "#ffffff",
    SECONDARY: {
      MAIN: "#dc004e",
      LIGHT: "#e33371",
      DARK: "#9a0036",
    },
  },
};

// Common theme options
export const COMMON_TYPOGRAPHY = {
  FONT_FAMILY: [
    "-apple-system",
    "BlinkMacSystemFont",
    '"Segoe UI"',
    "Roboto",
    '"Helvetica Neue"',
    "Arial",
    "sans-serif",
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
  ].join(","),
  HEADING_SIZES: {
    H1: "2.5rem",
    H2: "2rem",
    H3: "1.75rem",
    H4: "1.5rem",
    H5: "1.25rem",
    H6: "1rem",
  },
  HEADING_WEIGHT: 600,
};

// Component specific constants
export const COMPONENT_STYLES = {
  BUTTON: {
    BORDER_RADIUS: "4px",
    TEXT_TRANSFORM: "none" as const,
  },
};

// Cache control headers for API requests
export const NO_CACHE_HEADERS = {
  "Cache-Control": "no-cache, no-store, must-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

// Animation durations
export const ANIMATION_DURATIONS = {
  SHORT: 300,
  MEDIUM: 500,
  LONG: 800,
  PULSE: 1500, // pulse animation duration in ms
};

// Common timeout durations (in milliseconds)
export const TIMEOUTS = {
  FOCUS_DELAY: 50,
  PASSWORD_FIELD_FOCUS: 400,
  ERROR_FOCUS_DELAY: 100,
};

// UI spacing and sizing (in pixels)
export const UI = {
  SPACING: {
    SMALL: 2,
    MEDIUM: 3,
    LARGE: 6,
    XLARGE: 8,
  },
  SIZING: {
    ICON: {
      SMALL: 24,
      MEDIUM: 40,
      LARGE: 60,
      XLARGE: 100,
    },
    BORDER_RADIUS: {
      SMALL: 2,
      MEDIUM: 3,
      LARGE: 4,
    },
  },
  OPACITY: {
    LOW: 0.2,
    MEDIUM: 0.6,
    HIGH: 0.9,
    FULL: 1,
  },
  ANIMATION: {
    PULSE_KEYFRAMES: {
      START: 0.6,
      MIDDLE: 1,
      END: 0.6,
    },
  },
  BREAKPOINTS: {
    MOBILE: 600,
    TABLET: 960,
    DESKTOP: 1280,
  },
  GRID: {
    TILES_PER_ROW: {
      MOBILE: 1,
      TABLET: 2,
      DESKTOP: 3,
    },
  },
};
