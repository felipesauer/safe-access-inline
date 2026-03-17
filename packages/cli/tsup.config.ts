import { defineConfig } from "tsup";

export default defineConfig({
    entry: { cli: "src/cli-entry.ts" },
    format: ["esm"],
    outDir: "dist",
    banner: {
        js: "#!/usr/bin/env node",
    },
});
