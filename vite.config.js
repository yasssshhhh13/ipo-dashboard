import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Split the heaviest third-party libs into their own chunks so the main
    // bundle stays small and browsers can cache vendor code separately from
    // app code between deploys.
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ["recharts"],
          icons: ["lucide-react"],
          react: ["react", "react-dom"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
