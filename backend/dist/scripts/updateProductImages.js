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
const defaultImages = {
    'Coca-Cola 33cl (Canette)': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80',
    'Coca-Cola Canette 33cl': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80',
    'Eau Minérale Awa 1.5L': 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=300&auto=format&fit=crop&q=80',
    'Eau Minérale Céleste 1,5L': 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=300&auto=format&fit=crop&q=80',
    'Riz Parfumé Dinor 5kg': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&auto=format&fit=crop&q=80',
    'Huile Végétale Dinor 1L': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&auto=format&fit=crop&q=80',
    'Savon de Toilette Lux 125g': 'https://images.unsplash.com/photo-1607006314352-8706240248f7?w=300&auto=format&fit=crop&q=80',
    'Savon de Toilette Lux 100g': 'https://images.unsplash.com/photo-1607006314352-8706240248f7?w=300&auto=format&fit=crop&q=80',
    'Biscuits Oreo 154g': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&auto=format&fit=crop&q=80',
    'Lait Bonnet Rouge 400g': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80',
    'Baguette Tradition Française': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=300&auto=format&fit=crop&q=80'
};
async function updateImages() {
    console.log(`🖼️ Mise à jour des images de produits dans MySQL (${config.database})...`);
    try {
        const conn = await mysql.createConnection(config);
        const [products] = await conn.execute('SELECT id, name, image FROM products');
        let count = 0;
        for (const prod of products) {
            const matchKey = Object.keys(defaultImages).find(k => prod.name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(prod.name.toLowerCase()));
            if (matchKey && (!prod.image || prod.image === '')) {
                const imgUrl = defaultImages[matchKey];
                await conn.execute('UPDATE products SET image = ? WHERE id = ?', [imgUrl, prod.id]);
                console.log(`✅ [ID: ${prod.id}] ${prod.name} -> Image mise à jour.`);
                count++;
            }
        }
        console.log(`🎉 Fin de mise à jour : ${count} image(s) enregistrée(s).`);
        await conn.end();
        process.exit(0);
    }
    catch (err) {
        console.error('❌ Erreur:', err.message);
        process.exit(1);
    }
}
updateImages();
