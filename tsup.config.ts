import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
    mcp: 'src/mcp.ts'
  },
  format: ['esm'],
  dts: true,
  clean: true,
  shims: true
});
