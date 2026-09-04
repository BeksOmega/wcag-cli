import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
    mcp: 'src/mcp.ts'
  },
  format: ['esm'],
  platform: 'node',
  target: 'node18',
  dts: true,
  clean: true,
  shims: true,
  splitting: false,
  banner: {
    js: `import { createRequire as __createRequire } from "module";
const require = __createRequire(import.meta.url);`
  },
  noExternal: ['commander', '@modelcontextprotocol/sdk']
});



