import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Ensures assets load correctly on GitHub Pages and local
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
});
