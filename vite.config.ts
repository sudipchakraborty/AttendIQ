import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: { '/api': { target: process.env.ATTENDIQ_API_TARGET || 'http://127.0.0.1:8000' } },
    fs: {
      deny: [
        '.env',
        '.env.*',
        '**/.git/**',
        '**/.attendiq/**',
        '**/server/**',
        '**/src/assets/**',
        '*.{crt,pem}',
      ],
    },
  },
  preview: {
    proxy: { '/api': { target: process.env.ATTENDIQ_API_TARGET || 'http://127.0.0.1:8000' } },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'material-ui': ['@mui/material', '@emotion/react', '@emotion/styled'],
        },
      },
    },
  },
});
