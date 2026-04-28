// controllers/transactionController.js
const {
  Transaksi,
  Transaction_detail,
  Santri,
  Produk,
  Admin,
  Balance,
  sequelize,
} = require('../models');
const { Op } = require('sequelize');
const Boom = require('@hapi/boom');

const transactionController = {
  /**
   * 1. Create top-up transaction
   * Saldo santri bertambah. Saldo kasir TIDAK berubah.
   */
  createTopupTransaction: async (request, h) => {
    const t = await sequelize.transaction();
    try {
      const kasirId = request.auth.credentials.id;
      const { santriId, amount } = request.payload;

      if (!santriId || !amount || amount <= 0) {
        await t.rollback();
        return Boom.badRequest('ID Santri dan jumlah top-up harus valid.');
      }

      const santri = await Santri.findByPk(santriId, { transaction: t });
      if (!santri) {
        await t.rollback();
        return Boom.notFound('Santri tidak ditemukan');
      }

      // Tambah saldo Santri
      const [santriBalance] = await Balance.findOrCreate({
        where: { ownerId: santriId, ownerType: 'santri' },
        defaults: { amount: 0 },
        transaction: t,
      });
      await santriBalance.increment('amount', { by: amount, transaction: t });

      // Buat catatan transaksi
      const transaction = await Transaksi.create(
        {
          santriId,
          kasirId,
          total_amount: amount,
          payment_method: 'TopUp',
        },
        { transaction: t }
      );

      await t.commit();

      return h
        .response({
          success: true,
          message: 'Top-up berhasil',
          data: {
            transaction,
            santri_new_balance: santriBalance.amount + amount,
          },
        })
        .code(201);
    } catch (error) {
      await t.rollback();
      console.error('Error creating topup transaction:', error);
      return Boom.internal('Gagal memproses top-up');
    }
  },

  /**
   * 2. Create purchase transaction
   * Bisa untuk Santri (dengan santriId) atau untuk Kasir sendiri (tanpa santriId).
   * Saldo kasir tidak akan berkurang saat membeli untuk diri sendiri.
   */
  createPurchaseTransaction: async (request, h) => {
    const t = await sequelize.transaction();
    try {
      const { id: authUserId, role: authUserRole } = request.auth.credentials;
      const { items, payment_method } = request.payload; // santriId tidak lagi dibaca dari payload

      let buyer;
      let buyerBalance;
      let santriIdForTx = null;
      let kasirIdForTx = null;
      let buyerType;

      // Menentukan pembeli berdasarkan peran di token
      if (authUserRole === 'santri') {
        buyerType = 'santri';
        buyer = await Santri.findByPk(authUserId, {
          include: [{ model: Balance, as: 'balance' }],
          transaction: t,
        });
        santriIdForTx = authUserId;
        kasirIdForTx = null; // Transaksi mandiri oleh santri
      } else if (['admin', 'kasir'].includes(authUserRole)) {
        buyerType = 'admin';
        buyer = await Admin.findByPk(authUserId, {
          include: [{ model: Balance, as: 'balance' }],
          transaction: t,
        });
        kasirIdForTx = authUserId;
        // santriIdForTx tetap null karena kasir membeli untuk diri sendiri
      } else {
        return Boom.forbidden(
          'Peran tidak diizinkan untuk melakukan transaksi.'
        );
      }

      if (!buyer) {
        await t.rollback();
        return Boom.unauthorized('Data pengguna dari token tidak valid.');
      }

      buyerBalance = buyer.balance;

      let totalAmount = 0;
      const purchaseDetails = [];

      for (const item of items) {
        const product = await Produk.findByPk(item.productId, {
          transaction: t,
        });
        if (!product) {
          await t.rollback();
          return Boom.notFound(
            `Produk dengan ID ${item.productId} tidak ditemukan`
          );
        }
        if (product.stock < item.quantity) {
          await t.rollback();
          return Boom.badRequest(`Stok ${product.name} tidak mencukupi.`);
        }
        totalAmount += parseFloat(product.price) * item.quantity;
        purchaseDetails.push({
          product,
          quantity: item.quantity,
          price: product.price,
        });
      }

      if (payment_method === 'Saldo') {
        // Pengecekan dan pengurangan saldo HANYA dilakukan jika pembeli adalah Santri
        if (buyerType === 'santri') {
          if (!buyerBalance || buyerBalance.amount < totalAmount) {
            await t.rollback();
            return Boom.badRequest(`Saldo tidak mencukupi.`);
          }
          await buyerBalance.decrement('amount', {
            by: totalAmount,
            transaction: t,
          });
        }
        // Jika pembeli adalah kasir, saldo tidak diperiksa dan tidak dikurangi.
      }

      const transaction = await Transaksi.create(
        {
          santriId: santriIdForTx,
          kasirId: kasirIdForTx,
          total_amount: totalAmount,
          payment_method,
        },
        { transaction: t }
      );

      for (const detail of purchaseDetails) {
        await Transaction_detail.create(
          {
            transactionId: transaction.id,
            productId: detail.product.id,
            quantity: detail.quantity,
            price: detail.price,
          },
          { transaction: t }
        );
        await detail.product.decrement('stock', {
          by: detail.quantity,
          transaction: t,
        });
      }

      await t.commit();

      const finalBalance = await Balance.findOne({
        where: { ownerId: buyer.id, ownerType: buyerType },
      });

      return h
        .response({
          success: true,
          message: 'Pembelian berhasil',
          data: {
            transaction,
            new_balance: finalBalance ? finalBalance.amount : 0,
          },
        })
        .code(201);
    } catch (error) {
      await t.rollback();
      console.error('Error creating purchase transaction:', error);
      return Boom.internal('Gagal memproses pembelian');
    }
  },
  /**
   * 3. Get all transactions (digabungkan dengan getTransactionHistory)
   */
  getAllTransactions: async (request, h) => {
    try {
      const {
        page = 1,
        limit = 10,
        startDate,
        endDate,
        santriId,
        kasirId,
      } = request.query;
      const offset = (page - 1) * parseInt(limit);

      const whereClause = {};
      if (startDate && endDate) {
        whereClause.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }
      if (santriId) whereClause.santriId = santriId;
      if (kasirId) whereClause.kasirId = kasirId;

      const { count, rows: transactions } = await Transaksi.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Santri,
            as: 'santri',
            attributes: ['id', 'id_santri', 'nama_santri'],
            required: false,
          }, // required: false agar transaksi kasir tetap muncul
          { model: Admin, as: 'kasir', attributes: ['id', 'username'] },
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: offset,
      });

      return h
        .response({
          success: true,
          data: {
            transactions,
            totalItems: count,
            currentPage: parseInt(page),
            totalPages: Math.ceil(count / limit),
          },
        })
        .code(200);
    } catch (error) {
      console.error('Error getting all transactions:', error);
      return Boom.internal('Gagal mengambil data transaksi');
    }
  },

  /**
   * 4. Get transaction by ID (digabungkan dengan getTransactionDetails)
   */
  getTransactionDetailsById: async (request, h) => {
    try {
      const { id } = request.params;
      const transaction = await Transaksi.findByPk(id, {
        include: [
          {
            model: Santri,
            as: 'santri',
            attributes: ['id', 'id_santri', 'nama_santri'],
            required: false,
          },
          { model: Admin, as: 'kasir', attributes: ['id', 'username'] },
          {
            model: Transaction_detail,
            as: 'details',
            include: [
              {
                model: Produk,
                as: 'product',
                attributes: ['id', 'name', 'price'],
              },
            ],
          },
        ],
      });

      if (!transaction) {
        return Boom.notFound('Transaksi tidak ditemukan');
      }

      return h.response({ success: true, data: transaction }).code(200);
    } catch (error) {
      console.error('Error getting transaction details by ID:', error);
      return Boom.internal('Gagal mengambil detail transaksi');
    }
  },

  /**
   * 5. Get transactions by Santri ID
   */
  getTransactionsBySantri: async (request, h) => {
    try {
      const { santriId } = request.params;
      const transactions = await Transaksi.findAll({
        where: { santriId: santriId },
        include: [
          { model: Admin, as: 'kasir', attributes: ['id', 'username'] },
          {
            model: Transaction_detail,
            as: 'details',
            include: [
              { model: Produk, as: 'product', attributes: ['name', 'price'] },
            ],
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      if (!transactions) {
        return Boom.notFound('Tidak ada transaksi untuk santri ini.');
      }

      return h.response({ success: true, data: transactions }).code(200);
    } catch (error) {
      console.error('Error getting transactions by santri:', error);
      return Boom.internal('Gagal mengambil transaksi santri');
    }
  },

  /**
   * 8. Delete transaction (for admin)
   */
  deleteTransaction: async (request, h) => {
    const t = await sequelize.transaction();
    try {
      const { id } = request.params;
      const transaction = await Transaksi.findByPk(id, {
        include: [{ model: Transaction_detail, as: 'details' }],
        transaction: t,
      });

      if (!transaction) {
        await t.rollback();
        return Boom.notFound('Transaksi tidak ditemukan');
      }

      let buyerBalance;
      // Tentukan saldo siapa yang akan dikembalikan
      if (transaction.santriId) {
        // Transaksi milik Santri
        buyerBalance = await Balance.findOne({
          where: { ownerId: transaction.santriId, ownerType: 'santri' },
          transaction: t,
        });
      } else {
        // Transaksi milik Kasir
        buyerBalance = await Balance.findOne({
          where: { ownerId: transaction.kasirId, ownerType: 'admin' },
          transaction: t,
        });
      }

      // Logika pembatalan saldo
      if (transaction.payment_method === 'Saldo') {
        // HANYA kembalikan saldo jika transaksi ini milik Santri
        if (buyerBalance && transaction.santriId) {
          await buyerBalance.increment('amount', {
            by: transaction.total_amount,
            transaction: t,
          });
        }
      } else if (transaction.payment_method === 'TopUp') {
        if (buyerBalance)
          await buyerBalance.decrement('amount', {
            by: transaction.total_amount,
            transaction: t,
          });
      }

      // Kembalikan stok produk jika ini adalah transaksi pembelian
      if (transaction.payment_method !== 'TopUp' && transaction.details) {
        for (const detail of transaction.details) {
          await Produk.increment('stock', {
            by: detail.quantity,
            where: { id: detail.productId },
            transaction: t,
          });
        }
      }

      await Transaction_detail.destroy({
        where: { transactionId: id },
        transaction: t,
      });
      await Transaksi.destroy({ where: { id: id }, transaction: t });

      await t.commit();
      return h
        .response({
          success: true,
          message: 'Transaksi berhasil dihapus dan dibatalkan.',
        })
        .code(200);
    } catch (error) {
      await t.rollback();
      console.error('Error deleting transaction:', error);
      return Boom.internal('Gagal menghapus transaksi');
    }
  },
};

module.exports = transactionController;
