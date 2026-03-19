import { defineConfig } from "tsup";

export default defineConfig({
    entry: { cli: "src/entry.ts" },
    // ESM-only: the CLI runs exclusively via Node >=24 (which has native ESM support).
    // No CJS consumers exist. The .mjs extension + shebang produces a directly executable binary.
    format: ["esm"],
    outDir: "dist",
    outExtension: () => ({ js: ".mjs" }),
    banner: {
        js: "#!/usr/bin/env node",
    },
});
