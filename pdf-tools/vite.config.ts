import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "VITE_");
  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || "/tools/pdf-tools/",
    build: {
      outDir: "../dist/tools/pdf-tools",
      emptyOutDir: false,
      // pdf.js (page previews) is split into its own chunk and only loaded when needed.
      chunkSizeWarningLimit: 1400,
    },
  };
});
