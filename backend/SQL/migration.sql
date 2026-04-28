-- Skrip SQL untuk membuat seluruh struktur database
-- Dialek: MySQL
-- Versi: Case-insensitive (semua nama tabel huruf kecil)

CREATE DATABASE IF NOT EXISTS `assalam`;
USE `assalam`;

-- Hapus tabel jika sudah ada untuk memulai dari awal (opsional, hati-hati di production)
DROP TABLE IF EXISTS `penjualans`, `ticketprice`, `members`, `regulers`, `staffs`, `ppmis`, `transaction_details`, `transaksis`, `balances`, `santris`, `admins`, `produks`, `categories`, `sequelizemeta`;

-- =================================================================
-- Tabel untuk Autentikasi dan Manajemen Internal
-- =================================================================

CREATE TABLE `admins` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(255) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'kasir') NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =================================================================
-- Tabel untuk Sistem Kasir (Santri & Kasir)
-- =================================================================

CREATE TABLE `santris` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `no` INTEGER,
    `id_santri` VARCHAR(255) NOT NULL UNIQUE,
    `nama_santri` VARCHAR(255) NOT NULL,
    `jenis_kelamin` ENUM('L', 'P') NOT NULL,
    `kelas` VARCHAR(255) NOT NULL,
    `unit` VARCHAR(255) NOT NULL,
    `FaceID` TEXT,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `balances` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `ownerId` INTEGER NOT NULL,
    `ownerType` VARCHAR(255) NOT NULL,
    `amount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `produks` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `price` INTEGER NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `categoryId` INTEGER,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE SET NULL
);

CREATE TABLE `transaksis` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `santriId` INTEGER NULL,
    `kasirId` INTEGER NULL,
    `total_amount` INTEGER NOT NULL, -- Diubah dari total_price
    `payment_method` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`santriId`) REFERENCES `santris`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`kasirId`) REFERENCES `admins`(`id`) ON DELETE RESTRICT
);

CREATE TABLE `transaction_details` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `transactionId` INTEGER NOT NULL,
    `productId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `price` INTEGER NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`transactionId`) REFERENCES `transaksis`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`productId`) REFERENCES `produks`(`id`) ON DELETE RESTRICT
);

-- =================================================================
-- Tabel untuk Sistem Ticketing
-- =================================================================

CREATE TABLE `ppmis` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `Username` VARCHAR(255) NOT NULL UNIQUE,
    `FaceID` TEXT,
    `Dibuat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `Login_Terakhir` DATETIME
);

CREATE TABLE `staffs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `Nama` VARCHAR(255) NOT NULL,
    `Gender` ENUM('L', 'P') NOT NULL,
    `No_WhatsApp` VARCHAR(255),
    `Dibuat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `members` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `Nama` VARCHAR(255) NOT NULL,
    `No_Telepon` VARCHAR(255) NOT NULL UNIQUE,
    `Tanggal_Kadaluarsa` DATETIME NOT NULL,
    `FaceID` TEXT,
    `Dibuat` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `regulers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `Nama` VARCHAR(255) NOT NULL,
    `No_Telepon` VARCHAR(255) NOT NULL
);

CREATE TABLE `penjualans` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `CustomerId` INTEGER NOT NULL,
    `Tanggal_Kunjungan` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `Kategori` ENUM('Reguler', 'PPMI', 'Santri', 'Member', 'Staff') NOT NULL,
    `Kuantitas` INTEGER NOT NULL,
    `Metode_Pembayaran` ENUM('Tunai', 'QRIS'),
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


CREATE TABLE `TicketPrices` (
    `kategori` ENUM('Reguler', 'Staff') NOT NULL PRIMARY KEY,
    `harga` INT NOT NULL DEFAULT 0,
    `discountPercentage` INT NOT NULL DEFAULT 0
);


CREATE TABLE `settings` (
    `key` VARCHAR(255) PRIMARY KEY NOT NULL,
    `value` LONGTEXT NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `sequelizemeta` (
    `name` VARCHAR(255) NOT NULL UNIQUE PRIMARY KEY
);
