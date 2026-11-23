import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "VITE_");
  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || "/tools/image-compressor/",
    build: {
      outDir: "../dist/tools/image-compressor",
      emptyOutDir: false,
    },
  };
});
