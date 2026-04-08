import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // ENTSO-E does not send CORS headers, so we proxy from /api/entsoe
      // → https://web-api.tp.entsoe.eu/api during local dev.
      // For production deployment we'll need a real backend (see Task 1.3).
      '/api/entsoe': {
        target: 'https://web-api.tp.entsoe.eu',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/entsoe/, '/api'),
      },
    },
  },
});
