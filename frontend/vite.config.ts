import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';

// Detect if we are running in Electron desktop mode or pure Web mode
const isElectron = process.env.ELECTRON === 'true' || Boolean(process.env.npm_lifecycle_event?.startsWith('electron'));

// https://vitejs.dev/config/
export default defineConfig({
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
                }
              }
            },
            {
              entry: 'electron/preload.ts',
              onstart(options) {
                // Notifie le renderer de recharger la page
                options.reload();
              },
              vite: {
                build: {
                  outDir: 'dist-electron',
                }
              }
            },
          ]),
          renderer(),
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

