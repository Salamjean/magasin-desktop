-- ==========================================================
-- GESTMAGASIN PRO - Schéma SQL de la Base de Données MySQL
-- Compatible MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `magasin_db` 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `magasin_db`;

-- 1. Table des Utilisateurs
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'caissier', 'magasinier', 'livreur') NOT NULL DEFAULT 'caissier',
  `phone` VARCHAR(50) DEFAULT NULL,
  `avatar` LONGTEXT DEFAULT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `synced` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table des Paramètres de l'entreprise
CREATE TABLE IF NOT EXISTS `settings` (
  `key` VARCHAR(100) PRIMARY KEY,
  `value` LONGTEXT NOT NULL,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table des Caisses Enregistreuses
CREATE TABLE IF NOT EXISTS `cash_registers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `notes` TEXT DEFAULT NULL,
  `synced` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table des Catégories de Produits
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `icon` VARCHAR(50) DEFAULT 'Package',
  `color` VARCHAR(20) DEFAULT '#0284c7',
  `synced` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table des Fournisseurs
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `contact_name` VARCHAR(150) DEFAULT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `tax_number` VARCHAR(100) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `synced` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Table des Clients
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `address` TEXT DEFAULT NULL,
  `credit_limit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `current_debt` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `loyalty_points` INT NOT NULL DEFAULT 0,
  `synced` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Table des Produits / Articles
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(200) NOT NULL,
  `reference` VARCHAR(100) NOT NULL UNIQUE,
  `barcode` VARCHAR(100) NOT NULL UNIQUE,
  `category_id` INT DEFAULT NULL,
  `purchase_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `selling_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `stock_quantity` INT NOT NULL DEFAULT 0,
  `min_stock` INT NOT NULL DEFAULT 5,
  `unit` VARCHAR(50) NOT NULL DEFAULT 'pièce',
  `image` LONGTEXT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `synced` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `fk_prod_cat` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Table des Sessions de Caisse (Ouverture / Clôture)
CREATE TABLE IF NOT EXISTS `cash_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `cash_register_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `opening_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `closing_amount` DECIMAL(12,2) DEFAULT NULL,
  `expected_closing_amount` DECIMAL(12,2) DEFAULT NULL,
  `status` ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  `opened_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `closed_at` DATETIME DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `synced` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `fk_cs_register` (`cash_register_id`),
  KEY `fk_cs_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Table des Mouvements d'Espèces de Caisse (Entrées / Sorties)
CREATE TABLE IF NOT EXISTS `cash_movements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `cash_session_id` INT NOT NULL,
  `type` ENUM('deposit', 'withdrawal') NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `synced` TINYINT(1) NOT NULL DEFAULT 1,
  KEY `fk_cm_session` (`cash_session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Table des Ventes
CREATE TABLE IF NOT EXISTS `sales` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_number` VARCHAR(100) NOT NULL UNIQUE,
  `user_id` INT NOT NULL,
  `customer_id` INT DEFAULT NULL,
  `cash_session_id` INT DEFAULT NULL,
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `paid_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `change_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'cash',
  `payment_status` VARCHAR(50) NOT NULL DEFAULT 'paid',
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `synced` TINYINT(1) NOT NULL DEFAULT 1,
  KEY `fk_sales_user` (`user_id`),
  KEY `fk_sales_customer` (`customer_id`),
  KEY `fk_sales_session` (`cash_session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Table des Lignes de Vente
CREATE TABLE IF NOT EXISTS `sale_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sale_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `product_name` VARCHAR(200) NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(12,2) NOT NULL,
  `subtotal` DECIMAL(12,2) NOT NULL,
  `synced` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `fk_si_sale` (`sale_id`),
  KEY `fk_si_prod` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Table des Mouvements de Stock
CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `type` ENUM('in', 'out', 'adjustment', 'return') NOT NULL,
  `quantity` INT NOT NULL,
  `reference` VARCHAR(100) NOT NULL,
  `reason` VARCHAR(255) NOT NULL,
  `user_id` INT NOT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `synced` TINYINT(1) NOT NULL DEFAULT 1,
  KEY `fk_sm_prod` (`product_id`),
  KEY `fk_sm_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Table des Livraisons
CREATE TABLE IF NOT EXISTS `deliveries` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `sale_id` INT NOT NULL,
  `customer_name` VARCHAR(150) NOT NULL,
  `customer_phone` VARCHAR(50) NOT NULL,
  `delivery_address` TEXT NOT NULL,
  `livreur_id` INT DEFAULT NULL,
  `status` ENUM('pending', 'in_transit', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
  `otp_code` VARCHAR(10) NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `delivered_at` DATETIME DEFAULT NULL,
  `synced` TINYINT(1) NOT NULL DEFAULT 1,
  KEY `fk_deliv_sale` (`sale_id`),
  KEY `fk_deliv_user` (`livreur_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Table des Dépenses
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'cash',
  `notes` TEXT DEFAULT NULL,
  `user_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `synced` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `fk_exp_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Table des Inventaires
CREATE TABLE IF NOT EXISTS `inventories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `reference` VARCHAR(100) NOT NULL UNIQUE,
  `status` ENUM('draft', 'validated', 'cancelled') NOT NULL DEFAULT 'draft',
  `user_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `synced` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `fk_inv_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Table des Lignes d'Inventaire
CREATE TABLE IF NOT EXISTS `inventory_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `inventory_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `theoretical_quantity` INT NOT NULL,
  `real_quantity` INT NOT NULL,
  `difference` INT NOT NULL,
  `cost_variance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `synced` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `fk_ii_inventory` (`inventory_id`),
  KEY `fk_ii_prod` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Table des Achats Fournisseurs
CREATE TABLE IF NOT EXISTS `purchases` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `reference` VARCHAR(100) NOT NULL UNIQUE,
  `supplier_id` INT NOT NULL,
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('ordered', 'received', 'partial', 'cancelled') NOT NULL DEFAULT 'ordered',
  `received_at` DATETIME DEFAULT NULL,
  `user_id` INT NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `synced` TINYINT(1) NOT NULL DEFAULT 1,
  KEY `fk_pur_supplier` (`supplier_id`),
  KEY `fk_pur_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Table des Lignes d'Achats
CREATE TABLE IF NOT EXISTS `purchase_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `purchase_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(12,2) NOT NULL,
  `subtotal` DECIMAL(12,2) NOT NULL,
  `synced` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `fk_pi_purchase` (`purchase_id`),
  KEY `fk_pi_prod` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==========================================================
-- DONNÉES INITIALES (SEED DATA)
-- ==========================================================

-- Utilisateurs de démonstration (Mots de passe : admin123, caissier123, etc.)
INSERT IGNORE INTO `users` (`id`, `name`, `email`, `password`, `role`, `phone`, `active`, `synced`) VALUES
(1, 'Administrateur Principal', 'admin@gestmagasin.com', 'admin123', 'admin', '+225 07 00 00 01', 1, 1),
(2, 'Jean Caissier', 'caissier@gestmagasin.com', 'caissier123', 'caissier', '+225 07 00 00 02', 1, 1),
(3, 'Moussa Magasinier', 'magasinier@gestmagasin.com', 'magasinier123', 'magasinier', '+225 07 00 00 03', 1, 1),
(4, 'Kouassi Livreur', 'livreur@gestmagasin.com', 'livreur123', 'livreur', '+225 07 00 00 04', 1, 1);

-- Paramètres généraux
INSERT IGNORE INTO `settings` (`key`, `value`) VALUES
('company_name', 'GEST MAGASIN PRO'),
('company_phone', '+225 07 88 99 00 11'),
('company_email', 'contact@gestmagasin.ci'),
('company_address', 'Abidjan Cocody, Rue des Jardins'),
('company_nif', 'CI-ABJ-2026-B-12345'),
('currency', 'FCFA'),
('tax_rate', '18'),
('receipt_footer', 'Merci de votre visite et à très bientôt !'),
('auto_sync', 'true');

-- Caisses enregistreuses
INSERT IGNORE INTO `cash_registers` (`id`, `name`, `code`, `is_active`, `notes`, `synced`) VALUES
(1, 'Caisse Principale N°1', 'CAISSE-01', 1, 'Caisse au rez-de-chaussée', 1),
(2, 'Caisse Express N°2', 'CAISSE-02', 1, 'Caisse rapide', 1);

-- Catégories
INSERT IGNORE INTO `categories` (`id`, `name`, `description`, `icon`, `color`, `synced`) VALUES
(1, 'Boissons & Rafraîchissements', 'Jus, Sodas, Eaux minérales et bières', 'Coffee', '#0284c7', 1),
(2, 'Alimentation & Épicerie', 'Riz, Huiles, Conserves, Pâtes', 'ShoppingBag', '#16a34a', 1),
(3, 'Hygiène & Entretien', 'Savons, Détergents, Produits ménagers', 'Sparkles', '#9333ea', 1),
(4, 'Snacks & Biscuiterie', 'Biscuits, Chocolats, Confiseries', 'Cookie', '#ea580c', 1);

-- Articles / Produits
INSERT IGNORE INTO `products` (`id`, `name`, `reference`, `barcode`, `category_id`, `purchase_price`, `selling_price`, `stock_quantity`, `min_stock`, `unit`, `is_active`, `synced`) VALUES
(1, 'Coca-Cola 33cl (Canette)', 'PROD-001', '5449000000996', 1, 350.00, 500.00, 120, 20, 'pièce', 1, 1),
(2, 'Eau Minérale Awa 1.5L', 'PROD-002', '6181100010023', 1, 250.00, 400.00, 85, 15, 'bouteille', 1, 1),
(3, 'Riz Parfumé Dinor 5kg', 'PROD-003', '6181100020039', 2, 3800.00, 4750.00, 40, 10, 'sac', 1, 1),
(4, 'Huile Végétale Dinor 1L', 'PROD-004', '6181100030045', 2, 1100.00, 1400.00, 60, 12, 'bouteille', 1, 1),
(5, 'Savon de Toilette Lux 125g', 'PROD-005', '6181100040051', 3, 300.00, 450.00, 95, 25, 'pièce', 1, 1),
(6, 'Biscuits Oreo 154g', 'PROD-006', '7622210449283', 4, 600.00, 850.00, 50, 15, 'paquet', 1, 1);

-- Fournisseurs
INSERT IGNORE INTO `suppliers` (`id`, `name`, `contact_name`, `email`, `phone`, `address`, `tax_number`, `notes`, `synced`) VALUES
(1, 'SOCOCE Distribution', 'M. Touré', 'contact@sococe.ci', '+225 27 22 44 00', 'Zone Industrielle de Yopougon, Abidjan', 'CI-1998-A-0987', 'Fournisseur principal agro-alimentaire', 1),
(2, 'Solibra Côte d\'Ivoire', 'Service Commercial', 'commandes@solibra.ci', '+225 27 21 21 88', 'Boulevard de Marseille, Treichville', 'CI-1955-B-0012', 'Boissons et sodas', 1);

-- Clients
INSERT IGNORE INTO `customers` (`id`, `name`, `phone`, `email`, `address`, `credit_limit`, `current_debt`, `loyalty_points`, `synced`) VALUES
(1, 'Client Comptoir Standard', 'N/A', '', 'Sur place', 0.00, 0.00, 0, 1),
(2, 'Société Ivoire BTP', '+225 07 48 00 12', 'achats@ivoirebtp.ci', 'Plateau, Immeuble Alpha', 500000.00, 120000.00, 340, 1),
(3, 'Mme Aminata Koné', '+225 05 55 44 33', 'aminata.kone@gmail.com', 'Riviera Palmeraie', 100000.00, 0.00, 150, 1);
