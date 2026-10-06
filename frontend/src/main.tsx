import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { seedDatabase } from './db/seed';
import { syncService } from './db/syncService';
import './index.css';

// 1. Synchronisation initiale depuis le serveur MySQL
// 2. Fallback sur le seed local si hors-ligne ou base vierge
async function bootstrap() {
  try {
    const pulled = await syncService.pullFromRemote();
    if (!pulled) {
      await seedDatabase();
    }
  } catch (err) {
    console.warn('Initial sync fallback to seed:', err);
    await seedDatabase().catch((e) => console.error('Database seeding error:', e));
  }
}

bootstrap();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

