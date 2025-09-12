import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        '@google-cloud/text-to-speech',
        '@google/generative-ai',
        'dotenv/config',
        'fs/promises',
        'path',
      ],
    },
  },
});