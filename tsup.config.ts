import { defineConfig } from "tsup";

export default defineConfig({
  name: "requery",
  clean: true,
  minify: true,
  sourcemap: false,
  outDir: "dist",
  format: ["esm"],
  entry: {
    requery: "src/main.ts",
  },
  dts: {
    entry: {
      requery: "src/types.ts",
    },
  },
});
