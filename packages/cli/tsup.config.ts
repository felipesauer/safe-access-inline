import { defineConfig } from "tsup";

export default defineConfig({
    entry: { cli: "src/cli-entry.ts" },
    format: ["esm"],
    outDir: "dist",
    outExtension: () => ({ js: ".mjs" }),
    banner: {
        js: "#!/usr/bin/env node",
    },
});
