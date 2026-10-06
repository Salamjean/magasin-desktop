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

export async function testConnection(): Promise<boolean> {
  try {
    const conn = await pool.getConnection();
    await conn.ping();

    // Migration automatique pour garantir que les images ne sont jamais tronquées par MySQL
    try {
      await conn.query("ALTER TABLE products MODIFY COLUMN image LONGTEXT NULL");
      await conn.query("ALTER TABLE users MODIFY COLUMN avatar LONGTEXT NULL");
      await conn.query("ALTER TABLE settings MODIFY COLUMN value LONGTEXT NOT NULL");
      await conn.query("ALTER TABLE sales MODIFY COLUMN payment_status VARCHAR(50) NOT NULL DEFAULT 'paid'");
      await conn.query("ALTER TABLE sales MODIFY COLUMN payment_method VARCHAR(50) NOT NULL DEFAULT 'cash'");
    } catch (migErr: any) {
      // Ignorer si la table n'existe pas encore
    }

    conn.release();
    console.log(`✅ Base de données MySQL connectée avec succès (${dbHost}:${dbPort}/${dbName})`);
    return true;
  } catch (err: any) {
    console.warn(`⚠️ Avertissement connexion MySQL (${dbHost}:${dbPort}):`, err.message);
    return false;
  }
}


