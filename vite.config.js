// vite.config.js
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      name: "ReQuery",
      fileName: "requery",
      formats: ["es"],
    },
    minify: "esbuild",
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        format: "es",
      },
    },
    target: "esnext",
    sourcemap: false,
    define: {
      "process.env.NODE_ENV": '"production"',
    },
  },
  esbuild: {
    drop: ["debugger"],
  },
  define: {
    "process.env": "{}",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
