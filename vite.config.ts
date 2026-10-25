import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project sites are served from /<repo>/ — override with VITE_BASE when deploying
// to a custom domain or to a host that serves from the root.
const base = process.env.VITE_BASE ?? '/contrastjudge/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: false,
    cssCodeSplit: true,
    reportCompressedSize: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
