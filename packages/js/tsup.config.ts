import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
    },
    // Dual CJS + ESM output: the library is consumed by both CommonJS (Node require)
    // and ESM (import) consumers. CJS is needed for older bundlers and test setups.
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
});
