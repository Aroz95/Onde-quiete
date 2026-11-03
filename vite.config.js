import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base relativa: funziona su GitHub Pages qualunque sia il nome del repository
export default defineConfig({
  plugins: [react()],
  base: "./",
});
