import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        setupFiles: ['./tests/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov', 'clover'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/index.ts',
                'src/contracts/**',
                'src/types/**',
                'src/enums/**',
                'src/core/parser-config.ts',
            ],
            thresholds: {
                lines: 100,
                functions: 100,
                branches: 100,
                statements: 100,
            },
        },
        typecheck: {
            enabled: true,
            include: ['tests/**/*.test-d.ts'],
        },
    },
    benchmark: {
        outputFile: './bench-results.json',
    },
});
