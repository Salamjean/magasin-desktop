import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = Number(process.env.DB_PORT) || 3306;
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
const dbName = process.env.DB_NAME || 'magasin_db';
export const pool = mysql.createPool({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 8000
});
export async function testConnection() {
    try {
        const conn = await pool.getConnection();
        await conn.ping();
        conn.release();
        console.log(`✅ Base de données MySQL connectée avec succès (${dbHost}:${dbPort}/${dbName})`);
        return true;
    }
    catch (err) {
        console.warn(`⚠️ Avertissement connexion MySQL (${dbHost}:${dbPort}):`, err.message);
        return false;
    }
}
