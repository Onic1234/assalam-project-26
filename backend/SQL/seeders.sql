-- Skrip SQL untuk mengisi (seed) semua tabel dengan data awal
-- Dialek: MySQL
-- Pastikan database 'assalam' sudah dipilih (USE assalam;)
USE `assalam`;

-- Mengosongkan tabel sebelum mengisi data baru untuk menghindari duplikasi
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `transaction_details`;
TRUNCATE TABLE `transaksis`;
TRUNCATE TABLE `penjualans`;
TRUNCATE TABLE `balances`;
TRUNCATE TABLE `admins`;
TRUNCATE TABLE `santris`;
TRUNCATE TABLE `produks`;
TRUNCATE TABLE `categories`;
TRUNCATE TABLE `ticketprices`;
TRUNCATE TABLE `ppmis`;
TRUNCATE TABLE `staffs`;
TRUNCATE TABLE `members`;
TRUNCATE TABLE `regulers`;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Seeding Admins
-- Password untuk semua user di bawah ini adalah 'password123'
INSERT INTO `admins` (`id`, `username`, `password`, `role`, `createdAt`, `updatedAt`) VALUES
(1, 'admin', '$2a$10$FeLig0HmqyrB1Ju4XfXBbOkjVW0Vnv81FeNVSBZJB5OQehM2q8MAm', 'admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'kasir01', '$2a$10$FeLig0HmqyrB1Ju4XfXBbOkjVW0Vnv81FeNVSBZJB5OQehM2q8MAm', 'kasir', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 2. Seeding Santris
INSERT INTO `santris` (`id`, `no`, `id_santri`, `nama_santri`, `jenis_kelamin`, `kelas`, `unit`, `FaceID`, `createdAt`, `updatedAt`) VALUES
(1, 1, 'SNT001', 'Ahmad Fauzi', 'L', 'XII IPA 1', 'Asrama Putra', '[0.1, -0.2, 0.3, -0.4, 0.5, -0.6, 0.7, -0.8, 0.9, -0.1, 0.11, -0.12, 0.13, -0.14, 0.15, -0.16, 0.17, -0.18, 0.19, -0.2, 0.21, -0.22, 0.23, -0.24, 0.25, -0.26, 0.27, -0.28, 0.29, -0.3, 0.31, -0.32, 0.33, -0.34, 0.35, -0.36, 0.37, -0.38, 0.39, -0.4, 0.41, -0.42, 0.43, -0.44, 0.45, -0.46, 0.47, -0.48, 0.49, -0.5, 0.51, -0.52, 0.53, -0.54, 0.55, -0.56, 0.57, -0.58, 0.59, -0.6, 0.61, -0.62, 0.63, -0.64, 0.65, -0.66, 0.67, -0.68, 0.69, -0.7, 0.71, -0.72, 0.73, -0.74, 0.75, -0.76, 0.77, -0.78, 0.79, -0.8, 0.81, -0.82, 0.83, -0.84, 0.85, -0.86, 0.87, -0.88, 0.89, -0.9, 0.91, -0.92, 0.93, -0.94, 0.95, -0.96, 0.97, -0.98, 0.99, -1.0, 1.01, -1.02, 1.03, -1.04, 1.05, -1.06, 1.07, -1.08, 1.09, -1.1, 1.11, -1.12, 1.13, -1.14, 1.15, -1.16, 1.17, -1.18, 1.19, -1.2, 1.21, -1.22, 1.23, -1.24, 1.25, -1.26, 1.27, -1.28]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 2, 'SNT002', 'Siti Aminah', 'P', 'XI IPS 2', 'Asrama Putri', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 3. Seeding Balances
INSERT INTO `balances` (`ownerId`, `ownerType`, `amount`, `createdAt`, `updatedAt`) VALUES
(1, 'admin', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'admin', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 'santri', 50000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'santri', 75000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 4. Seeding Categories & Produks
INSERT INTO `categories` (`id`, `name`, `createdAt`, `updatedAt`) VALUES
(1, 'Minuman', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'Makanan Ringan', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO `produks` (`id`, `name`, `price`, `stock`, `categoryId`, `createdAt`, `updatedAt`) VALUES
(1, 'Teh Botol', 3000, 100, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 'Aqua 600ml', 2500, 150, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(3, 'Chitato', 5000, 50, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 5. Seeding Pelanggan Ticketing
INSERT INTO `ppmis` (`id`, `Username`, `FaceID`, `Dibuat`, `Login_Terakhir`) VALUES
(1, 'ppmi_user_1', '[0.1, -0.2, 0.3, -0.4, 0.5, -0.6, 0.7, -0.8, 0.9, -0.1, 0.11, -0.12, 0.13, -0.14, 0.15, -0.16, 0.17, -0.18, 0.19, -0.2, 0.21, -0.22, 0.23, -0.24, 0.25, -0.26, 0.27, -0.28, 0.29, -0.3, 0.31, -0.32, 0.33, -0.34, 0.35, -0.36, 0.37, -0.38, 0.39, -0.4, 0.41, -0.42, 0.43, -0.44, 0.45, -0.46, 0.47, -0.48, 0.49, -0.5, 0.51, -0.52, 0.53, -0.54, 0.55, -0.56, 0.57, -0.58, 0.59, -0.6, 0.61, -0.62, 0.63, -0.64, 0.65, -0.66, 0.67, -0.68, 0.69, -0.7, 0.71, -0.72, 0.73, -0.74, 0.75, -0.76, 0.77, -0.78, 0.79, -0.8, 0.81, -0.82, 0.83, -0.84, 0.85, -0.86, 0.87, -0.88, 0.89, -0.9, 0.91, -0.92, 0.93, -0.94, 0.95, -0.96, 0.97, -0.98, 0.99, -1.0, 1.01, -1.02, 1.03, -1.04, 1.05, -1.06, 1.07, -1.08, 1.09, -1.1, 1.11, -1.12, 1.13, -1.14, 1.15, -1.16, 1.17, -1.18, 1.19, -1.2, 1.21, -1.22, 1.23, -1.24, 1.25, -1.26, 1.27, -1.28]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO `staffs` (`id`, `Nama`, `Gender`, `No_WhatsApp`, `Dibuat`) VALUES
(1, 'Budi Staff', 'L', '081234567890', CURRENT_TIMESTAMP);

INSERT INTO `members` (`id`, `Nama`, `No_Telepon`, `Tanggal_Kadaluarsa`, `FaceID`, `Dibuat`) VALUES
(1, 'Rina Member', '085712345678', DATE_ADD(NOW(), INTERVAL 1 YEAR), '[0.02170095220208168,0.043474309146404266,0.05788769945502281]', CURRENT_TIMESTAMP);

INSERT INTO `regulers` (`id`, `Nama`, `No_Telepon`) VALUES
(1, 'Pengunjung Umum 1', '089987654321');

-- 6. Seeding Transaksis & Transaction_details
INSERT INTO `transaksis` (`id`, `santriId`, `kasirId`, `total_amount`, `payment_method`, `createdAt`, `updatedAt`) VALUES
(1, 1, 2, 8000, 'Saldo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, NULL, 2, 5000, 'Tunai', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO `transaction_details` (`transactionId`, `productId`, `quantity`, `price`, `createdAt`, `updatedAt`) VALUES
(1, 1, 1, 3000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, 3, 1, 5000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(2, 3, 1, 5000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 7. Seeding Penjualans (Ticketing)
INSERT INTO `penjualans` (`CustomerId`, `Tanggal_Kunjungan`, `Kategori`, `Kuantitas`, `Metode_Pembayaran`, `createdAt`, `updatedAt`) VALUES
(1, CURRENT_TIMESTAMP, 'Reguler', 2, 'QRIS', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
(1, CURRENT_TIMESTAMP, 'Staff', 1, 'Tunai', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 8. Seeding TicketPrices
INSERT INTO `ticketprices` (`kategori`, `harga`, `discountPercentage`) VALUES
('Reguler', 25000, 0),
('Staff', 10000, 0);

