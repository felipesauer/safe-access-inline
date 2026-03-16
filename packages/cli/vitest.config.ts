import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["tests/**/*.test.ts"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.ts"],
            exclude: ["src/cli-entry.ts"],
            reporter: ["text", "lcov"],
            thresholds: {
                statements: 100,
                branches: 95,
                functions: 100,
                lines: 100,
            },
        },
    },
});
