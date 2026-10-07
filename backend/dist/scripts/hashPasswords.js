import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
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
async function hashAllPasswords() {
    console.log(`🔒 Vérification et hachage des mots de passe dans MySQL (${config.database})...`);
    try {
        const conn = await mysql.createConnection(config);
        const [rows] = await conn.execute('SELECT id, name, email, password FROM users');
        let updatedCount = 0;
        for (const user of rows) {
            const currentPwd = user.password || '';
            if (!currentPwd.startsWith('$2a$') && !currentPwd.startsWith('$2b$')) {
                const hashed = await bcrypt.hash(currentPwd || 'admin123', 10);
                await conn.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);
                console.log(`✅ Utilisateur [ID: ${user.id}] ${user.name} (${user.email}) -> mot de passe haché avec succès.`);
                updatedCount++;
            }
            else {
                console.log(`ℹ️ Utilisateur [ID: ${user.id}] ${user.name} a déjà un mot de passe haché.`);
            }
        }
        console.log(`🎉 Fin de l'opération : ${updatedCount} mot(s) de passe mis à jour sur ${rows.length} utilisateur(s).`);
        await conn.end();
        process.exit(0);
    }
    catch (err) {
        console.error('❌ Erreur lors du hachage des mots de passe:', err.message);
        process.exit(1);
    }
}
hashAllPasswords();
