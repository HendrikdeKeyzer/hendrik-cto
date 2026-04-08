import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const haBase = env.VITE_HA_BASE || 'https://ha.richardheesen.nl';

  return {
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
        // Home Assistant REST API. Same CORS story — browser can't call HA
        // directly, so we proxy. Target is configurable via VITE_HA_BASE
        // (defaults to Hendrik's public hostname).
        '/api/ha': {
          target: haBase,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/ha/, ''),
        },
      },
    },
  };
});
