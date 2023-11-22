import { resolve } from 'node:path';

import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    minify: false,
    lib: {
      entry: {
        blocksuite: resolve(root, 'src/blocksuite/index.ts'),
        index: resolve(root, 'src/index.ts'),
        atom: resolve(root, 'src/atom/index.ts'),
        command: resolve(root, 'src/command/index.ts'),
        type: resolve(root, 'src/type.ts'),
        'core/event-emitter': resolve(root, 'src/core/event-emitter.ts'),
        'preload/electron': resolve(root, 'src/preload/electron.ts'),
        '__internal__/workspace': resolve(
          root,
          'src/__internal__/workspace.ts'
        ),
        '__internal__/plugin': resolve(root, 'src/__internal__/plugin.ts'),
      },
      formats: ['es', 'cjs'],
      name: 'AffineInfra',
    },
    rollupOptions: {
      external: [
        'electron',
        'async-call-rpc',
        'rxjs',
        'zod',
        'react',
        'yjs',
        'nanoid',
        /^jotai/,
        /^@blocksuite/,
        /^@affine\/templates/,
      ],
    },
  },
  plugins: [dts()],
});
