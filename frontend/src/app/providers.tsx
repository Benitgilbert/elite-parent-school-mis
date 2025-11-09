"use client";

import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { ReactNode, useMemo } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: "light",
          primary: { main: "#0ea5e9" }, // sky-500
          secondary: { main: "#9333ea" }, // purple-600
          background: { default: "#f7fafc", paper: "#ffffff" },
        },
        shape: { borderRadius: 10 },
        typography: {
          fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        },
      }),
    []
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
