import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/db.js';

// Route imports
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import caissierRoutes from './routes/caissier.routes.js';
import magasinierRoutes from './routes/magasinier.routes.js';
import livreurRoutes from './routes/livreur.routes.js';
import syncRoutes from './routes/sync.routes.js';

import statusMonitor from 'express-status-monitor';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

// Monitoring & Charge Serveur (express-status-monitor)
// Sécurisation de l'accès au monitoring par Basic Auth (identifiants configurables dans .env)
app.use((req, res, next) => {
  if (req.path === '/status' || req.path.startsWith('/status/')) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.setHeader('WWW-Authenticate', 'Basic realm="GestMAG Server Monitoring"');
      return res.status(401).send('Authentification requise');
    }
    const [scheme, credentials] = authHeader.split(' ');
    if (scheme !== 'Basic' || !credentials) {
      res.setHeader('WWW-Authenticate', 'Basic realm="GestMAG Server Monitoring"');
      return res.status(401).send('Format d\'authentification invalide');
    }
    const decoded = Buffer.from(credentials, 'base64').toString('utf-8');
    const [user, pass] = decoded.split(':');
    const expectedUser = process.env.STATUS_USER || 'admin';
    const expectedPass = process.env.STATUS_PASSWORD || 'GestMag2026!';

    if (user === expectedUser && pass === expectedPass) {
      return next();
    }
    res.setHeader('WWW-Authenticate', 'Basic realm="GestMAG Server Monitoring"');
    return res.status(401).send('Identifiants incorrects');
  }
  next();
});

// Initialisation du middleware de monitoring en première position pour capturer le trafic
app.use(
  statusMonitor({
    title: 'GestMAG - Monitoring Serveur & Charge',
    path: '/status',
    spans: [
      { interval: 1, retention: 60 },
      { interval: 5, retention: 60 },
      { interval: 15, retention: 60 }
    ],
    chartVisibility: {
      cpu: true,
      mem: true,
      load: true,
      responseTime: true,
      rps: true,
      statusCodes: true
    },
    healthChecks: [
      {
        protocol: 'http',
        host: 'localhost',
        path: '/api/health',
        port: String(PORT)
      }
    ]
  })
);

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Route Racine
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🚀 API GestMagasin Pro - Serveur en ligne et opérationnel',
    domain: 'bnelboutique.com',
    status: 'online',
    endpoints: {
      health: '/api/health',
      syncHealth: '/api/sync/health'
    },
    timestamp: new Date().toISOString()
  });
});

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API GestMagasin Pro Node.js / Express active',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/caissier', caissierRoutes);
app.use('/api/magasinier', magasinierRoutes);
app.use('/api/livreur', livreurRoutes);
app.use('/api/sync', syncRoutes);

// Global 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route introuvable : ${req.method} ${req.url}` });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled API Error:', err);
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Protection contre les arrêts inattendus lors des coupures de base de données
process.on('uncaughtException', (err) => {
  console.warn('⚠️ Exception non interceptée rattrapée (serveur maintenu actif):', err.message);
});

process.on('unhandledRejection', (reason: any) => {
  console.warn('⚠️ Rejet de promesse non intercepté (serveur maintenu actif):', reason?.message || reason);
});

// Start Server
app.listen(PORT, async () => {
  console.log(`🚀 Serveur Backend Node.js démarré sur : http://localhost:${PORT}`);
  console.log(`📡 Endpoints API disponibles sur : http://localhost:${PORT}/api/`);
  try {
    await testConnection();
  } catch (err: any) {
    console.warn('Connexion MySQL initiale en attente...');
  }
});
