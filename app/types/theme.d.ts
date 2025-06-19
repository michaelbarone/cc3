import "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    highlight: Palette["primary"];
  }

  interface PaletteOptions {
    highlight?: PaletteOptions["primary"];
  }
}
