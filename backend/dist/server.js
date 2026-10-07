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
dotenv.config();
const app = express();
const PORT = Number(process.env.PORT) || 5000;
// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
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
app.use((err, req, res, next) => {
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
process.on('unhandledRejection', (reason) => {
    console.warn('⚠️ Rejet de promesse non intercepté (serveur maintenu actif):', reason?.message || reason);
});
// Start Server
app.listen(PORT, async () => {
    console.log(`🚀 Serveur Backend Node.js démarré sur : http://localhost:${PORT}`);
    console.log(`📡 Endpoints API disponibles sur : http://localhost:${PORT}/api/`);
    try {
        await testConnection();
    }
    catch (err) {
        console.warn('Connexion MySQL initiale en attente...');
    }
});
