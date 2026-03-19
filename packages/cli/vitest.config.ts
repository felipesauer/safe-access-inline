import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["tests/**/*.test.ts"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: ["src/entry.ts"],
            reporter: ["text", "lcov"],
            thresholds: {
                statements: 100,
                // branches: 95% — defensive fallback branches in cli.ts (defaultGetVersion catch,
                // non-Error catch, DEBUG stack trace) and command-handlers.ts (formatOutput pretty
                // default) are not practically reachable without mocking import.meta.url internals.
                branches: 95,
                functions: 100,
                lines: 100,
            },
        },
    },
});
