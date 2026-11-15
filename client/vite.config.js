import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
    proxy: process.env.VERCEL
      ? undefined
      : {
          '/api': 'http://localhost:5000',
        },
  },
});
