import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';

// Always compile Electron main and preload files
const isElectron = true;

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    ...(isElectron
      ? [
          electron([
            {
              // Main process entry file
              entry: 'electron/main.ts',
              onstart(options) {
                // Démarre l'application Electron
                options.startup();
              },
              vite: {
                build: {
                  outDir: 'dist-electron',
                  rollupOptions: {
                    external: ['mysql2', 'mysql2/promise']
                  }
                },
                plugins: [
                  {
                    name: 'copy-preload',
                    closeBundle() {
                      const src = path.resolve(__dirname, 'electron/preload.cjs');
                      const dest = path.resolve(__dirname, 'dist-electron/preload.cjs');
                      try {
                        const fs = require('fs');
                        fs.copyFileSync(src, dest);
                      } catch {
                        // Fallback import
                        import('fs').then(fsModule => fsModule.copyFileSync(src, dest)).catch(() => {});
                      }
                    }
                  }
                ]
              }
            }
          ]),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true, // Permet d'ouvrir le site depuis le réseau local / Internet / smartphone / tablette
  },
});

