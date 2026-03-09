import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        // Proxy /api requests to Vercel-style functions during local dev
        '/api': {
          target: 'http://localhost:3000',
          // In dev, Vite will serve the SPA; use a Vite plugin or run
          // the API separately. For now, this placeholder ensures
          // the fetch calls don't 404 in dev (see README for local setup).
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
});
