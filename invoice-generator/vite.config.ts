import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "VITE_");
  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || "/tools/invoice-generator/",
    build: {
      outDir: "../dist/tools/invoice-generator",
      emptyOutDir: false,
      // The PDF renderer (~1.2 MB) is split into its own chunk and only loaded on download.
      chunkSizeWarningLimit: 1400,
    },
  };
});
