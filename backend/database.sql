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

-- Compte Administrateur Unique (Mot de passe : 12345678)
INSERT IGNORE INTO `users` (`id`, `name`, `email`, `password`, `role`, `phone`, `active`, `synced`) VALUES
(1, 'Administrateur', 'admin@gmail.com', '$2a$10$fAgXd9fhYdoVDr.2T91Squgf.Niq6LFHHQOTPqWNQIEm1..AzKtuG', 'admin', '+225 07 00 00 00', 1, 1);

-- Paramètres généraux
INSERT IGNORE INTO `settings` (`key`, `value`) VALUES
('company_name', 'GEST MAGASIN PRO'),
('company_phone', '+225 07 00 00 00'),
('company_email', 'admin@gmail.com'),
('company_address', 'Abidjan, Côte d\'Ivoire'),
('company_nif', 'CI-ABJ-2026-B-12345'),
('currency', 'FCFA'),
('tax_rate', '0'),
('min_stock_alert', '10'),
('receipt_footer', 'Merci de votre visite et à très bientôt !'),
('auto_sync', 'true');

-- Caisse enregistreuse par défaut
INSERT IGNORE INTO `cash_registers` (`id`, `name`, `code`, `is_active`, `notes`, `synced`) VALUES
(1, 'Caisse Principale', 'CAISSE-01', 1, 'Caisse de vente principale', 1);

