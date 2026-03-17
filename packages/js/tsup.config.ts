import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        testing: 'src/core/reset-all.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
});
