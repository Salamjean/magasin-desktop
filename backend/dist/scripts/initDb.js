import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'magasin_db',
    multipleStatements: true
};
async function initDatabase() {
    console.log(`\n📦 Initialisation de la Base de Données MySQL (${config.host}:${config.port})...`);
    let rootConnection = null;
    try {
        // 1. Connect without specific DB to check/create the DB
        rootConnection = await mysql.createConnection({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            multipleStatements: true
        });
        console.log(`🔌 Connexion au serveur MySQL établie avec succès.`);
        // 2. Create Database if not exists
        await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        console.log(`✅ Base de données '${config.database}' vérifiée / créée.`);
        await rootConnection.end();
        rootConnection = null;
        // 3. Connect to the specific database
        const dbConnection = await mysql.createConnection(config);
        console.log(`📂 Exécution du script SQL complet (tables, index, données initiales)...`);
        const sqlFilePath = path.resolve(__dirname, '../../database.sql');
        if (fs.existsSync(sqlFilePath)) {
            const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
            await dbConnection.query(sqlContent);
            console.log(`🎉 Schéma et données initiales importés avec succès dans '${config.database}' !`);
        }
        else {
            console.warn(`⚠️ Fichier database.sql non trouvé à l'emplacement : ${sqlFilePath}`);
        }
        await dbConnection.end();
        console.log(`✨ Initialisation terminée avec succès !\n`);
        process.exit(0);
    }
    catch (err) {
        if (rootConnection) {
            try {
                await rootConnection.end();
            }
            catch (_) { }
        }
        console.error(`\n❌ Erreur lors de l'initialisation de la base de données :`, err.message);
        console.log(`👉 Vérifiez que votre serveur MySQL local (XAMPP, Laragon, WampServer ou Service MySQL Windows) est bien démarré et que les identifiants dans backend/.env sont corrects.\n`);
        process.exit(1);
    }
}
initDatabase();
