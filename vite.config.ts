import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";

// https://vite.dev/config/
// Note: the MeDo/Miaoda builder plugin was removed from production builds. It
// injected a global click interceptor, a third-party stylesheet and a fetch
// wrapper into every page; nothing in the app depends on them.
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Split rarely-changing vendor code into its own long-cacheable chunks
        // so returning players only re-download app code after a deploy.
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("framer-motion") || id.includes("/motion/")) return "vendor-motion";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("react-dom") || id.includes("react-router") || id.includes("/react/") || id.includes("scheduler")) return "vendor-react";
          return undefined;
        },
      },
    },
  },
});
