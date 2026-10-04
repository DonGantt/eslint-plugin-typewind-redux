import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  splitting: false,
  clean: true,
  platform: 'node',
  external: ['eslint', 'typewind-v4'],
  format: ['cjs', 'esm'],
  target: 'esnext',
  dts: true,
});
