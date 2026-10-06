import bcrypt from 'bcryptjs';
import { db } from './db';

export async function seedDatabase() {
  const userCount = await db.users.count();
  if (userCount > 0) return; // Déjà initialisé

  console.log('Initialisation du compte administrateur et des paramètres par défaut...');

  // 1. Compte Administrateur Unique
  await db.users.add({
    name: 'Administrateur',
    email: 'admin@gmail.com',
    password: bcrypt.hashSync('12345678', 10),
    role: 'admin',
    phone: '+225 07 00 00 00',
    active: true,
    synced: 1,
    created_at: new Date().toISOString()
  });

  // 2. Paramètres d'Entreprise par défaut
  await db.settings.bulkAdd([
    { key: 'company_name', value: 'GEST MAGASIN PRO' },
    { key: 'company_phone', value: '+225 07 00 00 00' },
    { key: 'company_email', value: 'admin@gmail.com' },
    { key: 'company_address', value: 'Abidjan, Côte d\'Ivoire' },
    { key: 'company_nif', value: 'CI-ABJ-2026-B-12345' },
    { key: 'company_logo', value: '' },
    { key: 'currency', value: 'FCFA' },
    { key: 'tax_rate', value: '0' },
    { key: 'min_stock_alert', value: '10' },
    { key: 'receipt_footer', value: 'Merci de votre visite et à très bientôt !' },
    { key: 'auto_sync', value: 'true' }
  ]);

  // 3. Caisse Enregistreuse par défaut
  await db.cash_registers.add({
    name: 'Caisse Principale',
    code: 'CAISSE-01',
    is_active: true,
    notes: 'Caisse de vente principale',
    synced: 1
  });

  console.log('Initialisation terminée.');
}
