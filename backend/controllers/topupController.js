// controllers/topupController.js
const { Santri, Member, Balance, Transaksi, sequelize } = require('../models');
const { Op } = require('sequelize'); // Import Op untuk operasi query
const Boom = require('@hapi/boom');

const topupController = {
  /**
   * FUNGSI BARU: Mencari santri berdasarkan nama (case-insensitive dan partial match).
   * Mengembalikan data santri jika ditemukan satu, atau error jika tidak ada/lebih dari satu.
   */
  findSantriByName: async (request, h) => {
    try {
      const { nama } = request.params;
      console.log(
        `[DEBUG] Backend menerima permintaan untuk mencari nama: "${nama}"`
      );

      // Pencarian dengan case-insensitive dan partial match
      const santris = await Santri.findAll({
        where: {
          nama_santri: {
            [Op.like]: `%${nama.trim()}%`, // iLike untuk PostgreSQL (case-insensitive)
            // Jika menggunakan MySQL, gunakan: [Op.like]: `%${nama.trim()}%`
            // dan tambahkan collate: { collate: 'utf8_general_ci' }
          },
        },
        // Langsung sertakan data saldo dalam pencarian
        include: {
          model: Balance,
          as: 'balance',
          attributes: ['amount'],
        },
      });

      console.log(
        `[DEBUG] Hasil dari database: ${santris.length} data ditemukan.`
      );

      if (santris.length === 0) {
        return Boom.notFound(`Santri dengan nama "${nama}" tidak ditemukan.`);
      }

      if (santris.length > 1) {
        // Coba cari yang exact match dulu (case-insensitive)
        const exactMatches = santris.filter(
          (santri) =>
            santri.nama_santri.toLowerCase() === nama.toLowerCase().trim()
        );

        if (exactMatches.length === 1) {
          // Jika ada satu exact match, gunakan itu
          const santriData = exactMatches[0].toJSON();
          const balanceAmount = santriData.balance
            ? santriData.balance.amount
            : 0;

          return h.response({
            success: true,
            message: 'Santri ditemukan (exact match)',
            data: {
              id: santriData.id,
              id_santri: santriData.id_santri,
              nama_santri: santriData.nama_santri,
              balance: { amount: balanceAmount },
            },
          });
        }

        // Jika tidak ada exact match atau lebih dari satu exact match
        // Kembalikan daftar opsi untuk dipilih user
        const options = santris.map((santri) => ({
          id: santri.id,
          id_santri: santri.id_santri,
          nama_santri: santri.nama_santri,
          kelas: santri.kelas,
          unit: santri.unit,
          balance: santri.balance ? santri.balance.amount : 0,
        }));

        return h
          .response({
            success: false,
            message: `Ditemukan ${santris.length} santri dengan nama serupa. Silakan pilih yang tepat:`,
            multiple_results: true,
            data: options,
          })
          .code(300); // 300 Multiple Choices
      }

      // Jika ditemukan tepat satu, kembalikan datanya
      const santriData = santris[0].toJSON();
      // Memberikan nilai default jika balance null
      const balanceAmount = santriData.balance ? santriData.balance.amount : 0;

      return h.response({
        success: true,
        message: 'Santri ditemukan',
        data: {
          id: santriData.id,
          id_santri: santriData.id_santri,
          nama_santri: santriData.nama_santri,
          balance: { amount: balanceAmount },
        },
      });
    } catch (error) {
      console.error('Error in findSantriByName:', error);
      return Boom.internal('Gagal mencari santri');
    }
  },

  /**
   * FUNGSI TAMBAHAN: Mencari santri dengan pencarian yang lebih advanced
   */
  searchSantri: async (request, h) => {
    try {
      const { q: query, limit = 10 } = request.query;

      console.log(`[DEBUG] Received search request with query: "${query}"`);
      console.log(`[DEBUG] Request query object:`, request.query);

      if (!query || query.trim().length < 1) {
        return Boom.badRequest('Query pencarian minimal 1 karakter');
      }

      console.log(`[DEBUG] Searching for: "${query.trim()}"`);

      // Coba query sederhana dulu untuk debugging
      const santris = await Santri.findAll({
        where: {
          [Op.or]: [
            {
              nama_santri: {
                [Op.like]: `%${query.trim()}%`, // Untuk MySQL
                // [Op.like]: `%${query.trim()}%` // Untuk PostgreSQL
              },
            },
            {
              id_santri: {
                [Op.like]: `%${query.trim()}%`, // Untuk MySQL
                // [Op.like]: `%${query.trim()}%` // Untuk PostgreSQL
              },
            },
          ],
        },
        include: {
          model: Balance,
          as: 'balance',
          attributes: ['amount'],
          required: false, // LEFT JOIN instead of INNER JOIN
        },
        limit: parseInt(limit),
        // Hapus ordering yang kompleks dulu untuk debugging
        order: [['nama_santri', 'ASC']],
      });

      console.log(`[DEBUG] Raw query results count: ${santris.length}`);
      console.log(
        `[DEBUG] First result (if any):`,
        santris[0] ? santris[0].toJSON() : 'No results'
      );

      const results = santris.map((santri) => {
        const santriData = santri.toJSON();
        return {
          id: santriData.id,
          id_santri: santriData.id_santri,
          nama_santri: santriData.nama_santri,
          jenis_kelamin: santriData.jenis_kelamin,
          kelas: santriData.kelas,
          unit: santriData.unit,
          // FIX: Always return balance as an object
          balance: {
            amount: santriData.balance ? santriData.balance.amount : 0,
          },
        };
      });

      console.log(`[DEBUG] Processed results:`, results);

      return h.response({
        success: true,
        message: `Ditemukan ${results.length} santri`,
        data: results,
        total: results.length,
      });
    } catch (error) {
      console.error('[ERROR] Error in searchSantri:', error);
      console.error('[ERROR] Error stack:', error.stack);
      return Boom.internal(`Gagal mencari santri: ${error.message}`);
    }
  },

  /**
   * FUNGSI LAMA (DIMODIFIKASI): Melakukan top-up berdasarkan ID unik santri atau member.
   * Lebih cepat dan aman karena tidak perlu lagi mencari berdasarkan nama.
   */
  createTopup: async (request, h) => {
    const t = await sequelize.transaction();
    try {
      const kasirId = request.auth.credentials.id;
      // Menerima santriId ATAU memberId
      const { santriId, memberId, amount } = request.payload;

      if (!santriId && !memberId) {
        await t.rollback();
        return Boom.badRequest('ID Santri atau ID Member harus ditentukan.');
      }

      let ownerId;
      let ownerType;
      let name;

      if (santriId) {
        const santri = await Santri.findByPk(santriId);
        if (!santri) {
          await t.rollback();
          return Boom.notFound('ID Santri tidak valid atau tidak ditemukan.');
        }
        ownerId = santriId;
        ownerType = 'santri';
        name = santri.nama_santri;
      } else {
        const member = await Member.findByPk(memberId);
        if (!member) {
          await t.rollback();
          return Boom.notFound('ID Member tidak valid atau tidak ditemukan.');
        }
        ownerId = memberId;
        ownerType = 'member';
        name = member.Nama;
      }

      const [ownerBalance] = await Balance.findOrCreate({
        where: { ownerId, ownerType },
        defaults: { amount: 0 },
        transaction: t,
      });

      const newBalance = ownerBalance.amount + amount;
      await ownerBalance.increment('amount', { by: amount, transaction: t });

      await Transaksi.create(
        {
          santriId: ownerType === 'santri' ? ownerId : null,
          memberId: ownerType === 'member' ? ownerId : null,
          kasirId,
          total_amount: amount,
          payment_method: 'TopUp',
          status: 'completed',
          Transaction_type: 'topup',
        },
        { transaction: t }
      );

      await t.commit();

      return h
        .response({
          success: true,
          message: 'Top-up berhasil',
          data: {
            owner_id: ownerId,
            owner_type: ownerType,
            name: name,
            amount_topped_up: amount,
            new_balance: newBalance,
          },
        })
        .code(201);
    } catch (error) {
      await t.rollback();
      console.error('Error in createTopup:', error);
      return Boom.internal('Gagal memproses top-up');
    }
  },

  findMemberByIdMember: async (request, h) => {
    try {
      const { id_member } = request.params;
      const member = await Member.findOne({
        where: { id_member: id_member.trim() },
        include: {
          model: Balance,
          as: 'balance',
          attributes: ['amount'],
        },
      });

      if (!member) {
        return Boom.notFound('Kartu Member tidak ditemukan.');
      }

      // Ambil 5 riwayat transaksi terakhir untuk ditampilkan di dashboard mandiri
      const transactions = await Transaksi.findAll({
        where: { memberId: member.id },
        order: [['createdAt', 'DESC']],
        limit: 5,
      });

      return h.response({
        success: true,
        data: {
          id: member.id,
          id_member: member.id_member,
          Nama: member.Nama,
          balance: {
            amount: member.balance ? member.balance.amount : 0,
          },
          transactions: transactions || [],
        },
      });
    } catch (error) {
      console.error('Error in findMemberByIdMember:', error);
      return Boom.internal('Gagal memproses pencarian member');
    }
  },

  createPublicTopup: async (request, h) => {
    const t = await sequelize.transaction();
    try {
      const { id_member, amount, payment_method = 'QRIS' } = request.payload;

      const member = await Member.findOne({
        where: { id_member: id_member.trim() },
        transaction: t,
      });

      if (!member) {
        await t.rollback();
        return Boom.notFound('Kartu Member tidak ditemukan.');
      }

      const [ownerBalance] = await Balance.findOrCreate({
        where: { ownerId: member.id, ownerType: 'member' },
        defaults: { amount: 0 },
        transaction: t,
      });

      const newBalance = ownerBalance.amount + amount;
      await ownerBalance.increment('amount', { by: amount, transaction: t });

      await Transaksi.create(
        {
          memberId: member.id,
          kasirId: null,
          total_amount: amount,
          payment_method: payment_method || 'QRIS',
          status: 'completed',
          Transaction_type: 'topup',
        },
        { transaction: t }
      );

      await t.commit();

      return h.response({
        success: true,
        message: 'Top-up saldo berhasil diproses',
        data: {
          owner_id: member.id,
          id_member: member.id_member,
          name: member.Nama,
          amount_topped_up: amount,
          new_balance: newBalance,
        },
      }).code(201);
    } catch (error) {
      await t.rollback();
      console.error('Error in createPublicTopup:', error);
      return Boom.internal('Gagal memproses top-up');
    }
  },
};

module.exports = topupController;
