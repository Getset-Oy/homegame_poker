import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import mkcert from 'vite-plugin-mkcert';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('../package.json', 'utf-8'));

export default defineConfig({
  // mkcert() disabled until CA installed: run ~/.vite-plugin-mkcert/mkcert -install
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    // Overridable so test instances can run on random ports without
    // colliding with the user's dev server (see CLAUDE.md: Local Testing)
    port: Number(process.env.VITE_PORT) || 5173,
    host: true,
    proxy: {
      '/socket.io': {
        target: `http://localhost:${process.env.SERVER_PORT || 3000}`,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
