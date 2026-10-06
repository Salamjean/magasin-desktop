import bcrypt from 'bcryptjs';
import { db } from './db';

export async function seedDatabase() {
  const userCount = await db.users.count();
  if (userCount > 0) return; // Already seeded

  console.log('Seeding initial data into local Dexie database...');

  // 1. Initial Users
  await db.users.bulkAdd([
    {
      name: 'Administrateur Principal',
      email: 'admin@gestmagasin.com',
      password: bcrypt.hashSync('admin123', 10),
      role: 'admin',
      phone: '+225 07 00 00 01',
      active: true,
      synced: 1,
      created_at: new Date().toISOString()
    },
    {
      name: 'Jean Caissier',
      email: 'caissier@gestmagasin.com',
      password: bcrypt.hashSync('caissier123', 10),
      role: 'caissier',
      phone: '+225 07 00 00 02',
      active: true,
      synced: 1,
      created_at: new Date().toISOString()
    },
    {
      name: 'Moussa Magasinier',
      email: 'magasinier@gestmagasin.com',
      password: bcrypt.hashSync('magasinier123', 10),
      role: 'magasinier',
      phone: '+225 07 00 00 03',
      active: true,
      synced: 1,
      created_at: new Date().toISOString()
    },
    {
      name: 'Kouassi Livreur',
      email: 'livreur@gestmagasin.com',
      password: bcrypt.hashSync('livreur123', 10),
      role: 'livreur',
      phone: '+225 07 00 00 04',
      active: true,
      synced: 1,
      created_at: new Date().toISOString()
    }
  ]);

  // 2. Initial Settings
  await db.settings.bulkAdd([
    { key: 'company_name', value: 'GEST MAGASIN PRO' },
    { key: 'company_phone', value: '+225 07 88 99 00 11' },
    { key: 'company_email', value: 'contact@gestmagasin.ci' },
    { key: 'company_address', value: 'Abidjan Cocody, Rue des Jardins' },
    { key: 'company_nif', value: 'CI-ABJ-2026-B-12345' },
    { key: 'currency', value: 'FCFA' },
    { key: 'tax_rate', value: '0' },
    { key: 'receipt_footer', value: 'Merci de votre visite et à très bientôt !' },
    { key: 'auto_sync', value: 'true' }
  ]);

  // 3. Initial Cash Registers
  await db.cash_registers.bulkAdd([
    { name: 'Caisse Principale N°1', code: 'CAISSE-01', is_active: true, notes: 'Caisse au rez-de-chaussée', synced: 1 },
    { name: 'Caisse Express N°2', code: 'CAISSE-02', is_active: true, notes: 'Caisse rapide', synced: 1 }
  ]);

  // 4. Initial Categories
  const cat1 = await db.categories.add({
    name: 'Boissons & Rafraîchissements',
    description: 'Jus, Sodas, Eaux minérales et bières',
    icon: 'Coffee',
    color: '#0284c7',
    synced: 1
  });

  const cat2 = await db.categories.add({
    name: 'Alimentation & Épicerie',
    description: 'Riz, Huiles, Conserves, Pâtes',
    icon: 'ShoppingBag',
    color: '#16a34a',
    synced: 1
  });

  const cat3 = await db.categories.add({
    name: 'Hygiène & Entretien',
    description: 'Savons, Détergents, Produits ménagers',
    icon: 'Sparkles',
    color: '#9333ea',
    synced: 1
  });

  const cat4 = await db.categories.add({
    name: 'Snacks & Biscuiterie',
    description: 'Biscuits, Chocolats, Confiseries',
    icon: 'Cookie',
    color: '#ea580c',
    synced: 1
  });

  // 5. Initial Products
  await db.products.bulkAdd([
    {
      name: 'Coca-Cola 33cl (Canette)',
      reference: 'PROD-001',
      barcode: '5449000000996',
      category_id: cat1,
      purchase_price: 350,
      selling_price: 500,
      stock_quantity: 120,
      min_stock: 20,
      unit: 'pièce',
      image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80',
      is_active: true,
      synced: 1
    },
    {
      name: 'Eau Minérale Awa 1.5L',
      reference: 'PROD-002',
      barcode: '6181100010023',
      category_id: cat1,
      purchase_price: 250,
      selling_price: 400,
      stock_quantity: 85,
      min_stock: 15,
      unit: 'bouteille',
      image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=300&auto=format&fit=crop&q=80',
      is_active: true,
      synced: 1
    },
    {
      name: 'Riz Parfumé Dinor 5kg',
      reference: 'PROD-003',
      barcode: '6181100020039',
      category_id: cat2,
      purchase_price: 3800,
      selling_price: 4750,
      stock_quantity: 40,
      min_stock: 10,
      unit: 'sac',
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&auto=format&fit=crop&q=80',
      is_active: true,
      synced: 1
    },
    {
      name: 'Huile Végétale Dinor 1L',
      reference: 'PROD-004',
      barcode: '6181100030045',
      category_id: cat2,
      purchase_price: 1100,
      selling_price: 1400,
      stock_quantity: 60,
      min_stock: 12,
      unit: 'bouteille',
      image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300&auto=format&fit=crop&q=80',
      is_active: true,
      synced: 1
    },
    {
      name: 'Savon de Toilette Lux 125g',
      reference: 'PROD-005',
      barcode: '6181100040051',
      category_id: cat3,
      purchase_price: 300,
      selling_price: 450,
      stock_quantity: 95,
      min_stock: 25,
      unit: 'pièce',
      image: 'https://images.unsplash.com/photo-1607006314352-8706240248f7?w=300&auto=format&fit=crop&q=80',
      is_active: true,
      synced: 1
    },
    {
      name: 'Biscuits Oreo 154g',
      reference: 'PROD-006',
      barcode: '7622210449283',
      category_id: cat4,
      purchase_price: 600,
      selling_price: 850,
      stock_quantity: 50,
      min_stock: 15,
      unit: 'paquet',
      image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&auto=format&fit=crop&q=80',
      is_active: true,
      synced: 1
    }
  ]);

  // 6. Initial Suppliers
  await db.suppliers.bulkAdd([
    {
      name: 'SOCOCE Distribution',
      contact_name: 'M. Touré',
      email: 'contact@sococe.ci',
      phone: '+225 27 22 44 00',
      address: 'Zone Industrielle de Yopougon, Abidjan',
      tax_number: 'CI-1998-A-0987',
      notes: 'Fournisseur principal agro-alimentaire',
      synced: 1
    },
    {
      name: 'Solibra Côte d\'Ivoire',
      contact_name: 'Service Commercial',
      email: 'commandes@solibra.ci',
      phone: '+225 27 21 21 88',
      address: 'Boulevard de Marseille, Treichville',
      tax_number: 'CI-1955-B-0012',
      notes: 'Boissons et sodas',
      synced: 1
    }
  ]);

  // 7. Initial Customers
  await db.customers.bulkAdd([
    {
      name: 'Client Comptoir Standard',
      phone: 'N/A',
      email: '',
      address: 'Sur place',
      credit_limit: 0,
      current_debt: 0,
      loyalty_points: 0,
      synced: 1
    },
    {
      name: 'Société Ivoire BTP',
      phone: '+225 07 48 00 12',
      email: 'achats@ivoirebtp.ci',
      address: 'Plateau, Immeuble Alpha',
      credit_limit: 500000,
      current_debt: 120000,
      loyalty_points: 340,
      synced: 1
    },
    {
      name: 'Mme Aminata Koné',
      phone: '+225 05 55 44 33',
      email: 'aminata.kone@gmail.com',
      address: 'Riviera Palmeraie',
      credit_limit: 100000,
      current_debt: 0,
      loyalty_points: 150,
      synced: 1
    }
  ]);

  console.log('Seeding completed successfully!');
}
