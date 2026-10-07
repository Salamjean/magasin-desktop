import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'magasin_db'
};
async function upgradeImageColumns() {
    console.log(`🔧 Mise à niveau des colonnes d'images en LONGTEXT dans MySQL (${config.database})...`);
    try {
        const conn = await mysql.createConnection(config);
        // 1. Table products -> image LONGTEXT
        await conn.execute('ALTER TABLE products MODIFY COLUMN image LONGTEXT DEFAULT NULL;');
        console.log('✅ products.image mis à jour en LONGTEXT.');
        // 2. Table users -> avatar LONGTEXT
        await conn.execute('ALTER TABLE users MODIFY COLUMN avatar LONGTEXT DEFAULT NULL;');
        console.log('✅ users.avatar mis à jour en LONGTEXT.');
        // 3. Table settings -> value LONGTEXT
        await conn.execute('ALTER TABLE settings MODIFY COLUMN value LONGTEXT DEFAULT NULL;');
        console.log('✅ settings.value mis à jour en LONGTEXT.');
        await conn.end();
        console.log('🎉 Mise à niveau terminée avec succès !');
        process.exit(0);
    }
    catch (err) {
        console.error('❌ Erreur lors de la mise à niveau :', err.message);
        process.exit(1);
    }
}
upgradeImageColumns();
