import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
      // Proxy WebSocket requests too - important for development
      '/': {
        target: 'ws://localhost:4000',
        ws: true,
      },
    }
  }
});
