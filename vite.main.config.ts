import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      // sql.js is pure JS — let Vite bundle it directly
      // No external modules needed
    },
  },
});
