"use client";

import { CssBaseline, ThemeProvider as MUIThemeProvider } from "@mui/material";
import { useSession } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";
import { darkTheme, getTheme } from "./theme";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { data: session } = useSession();
  const [theme, setTheme] = useState(darkTheme); // Default to dark theme

  useEffect(() => {
    if (session?.user?.theme) {
      // Get theme from user preference
      const userTheme = session.user.theme as "light" | "dark" | "system";
      setTheme(getTheme(userTheme));
    }
  }, [session?.user?.theme]);

  return (
    <MUIThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MUIThemeProvider>
  );
}
