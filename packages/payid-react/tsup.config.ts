import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: {
    resolve: ["@wagmi/core", "@tanstack/query-core"],
  },
  clean: true,
  outDir: "dist",
  external: ["react", "wagmi", "viem", "@wagmi/core", "ethers", "buffer", "crypto", "fs", "process"],
  treeshake: true,
});
