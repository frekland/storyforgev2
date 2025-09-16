import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['@google-cloud/text-to-speech', '@google/generative-ai', 'dotenv/config', 'fs/promises', 'path'],
      input: {
        main: resolve(__dirname, 'index.html'),
        debug: resolve(__dirname, 'debug-audio.html'),
        streaming: resolve(__dirname, 'test-streaming.html')
      }
    },
  },
});
