import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/sessionPolicy/index.ts",
    "src/rule/index.ts",
    "src/issuer/index.ts",
    "src/context/index.ts",
    "src/core/client/index.ts",
    "src/core/server/index.ts",
  ],
  format: ["esm"],
  dts: true,
  clean: true,
  outDir: "dist"
});