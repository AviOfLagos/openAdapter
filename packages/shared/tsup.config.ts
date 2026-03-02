import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/tools/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  minify: false,
  external: ['ai', 'zod'],
  outDir: 'dist',
});
