// controllers/authController.js

const jwt = require('jsonwebtoken');
const { Admin, Santri, Balance, sequelize } = require('../models');
const { Op } = require('sequelize');
const Boom = require('@hapi/boom');

// --- HELPER LAMA ---
const calculateEuclideanDistance = (desc1, desc2) => {
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    sum += (desc1[i] - desc2[i]) ** 2;
  }
  return Math.sqrt(sum);
};

const generateAdminToken = (admin) => {
  return jwt.sign(
    { id: admin.id, username: admin.username, role: admin.role },
    process.env.JWT_SECRET || 'default_secret_key',
    { expiresIn: '24h' }
  );
};

const generateSantriToken = (santri) => {
  return jwt.sign(
    {
      id: santri.id,
      id_santri: santri.id_santri,
      nama_santri: santri.nama_santri,
      role: 'santri',
    },
    process.env.JWT_SECRET || 'default_secret_key',
    { expiresIn: '24h' }
  );
};

const createResponse = (success, message, data = null) => {
  return { success, message, data };
};

const authController = {
  // 1. Register Admin atau Kasir baru
  // Pengecekan role sudah tidak diperlukan di sini, karena sudah ditangani oleh 'scope' di rute.
  register: async (request, h) => {
    const t = await sequelize.transaction();
    try {
      const { username, password, role } = request.payload;
      if (!['admin', 'kasir'].includes(role)) {
        return h.response(createResponse(false, 'Role tidak valid.')).code(400);
      }
      const existingAdmin = await Admin.findOne({ where: { username } });
      if (existingAdmin) {
        return h
          .response(createResponse(false, 'Username sudah terdaftar'))
          .code(409);
      }
      const newAdmin = await Admin.create(
        { username, password, role },
        { transaction: t }
      );
      await Balance.create(
        { ownerId: newAdmin.id, ownerType: 'admin', amount: 0 },
        { transaction: t }
      );
      await t.commit();
      const adminResponse = { ...newAdmin.toJSON() };
      delete adminResponse.password;
      return h
        .response(
          createResponse(true, 'Registrasi berhasil', { admin: adminResponse })
        )
        .code(201);
    } catch (error) {
      await t.rollback();
      console.error('Error in register:', error);
      return h
        .response(
          createResponse(false, 'Terjadi kesalahan pada server', error.message)
        )
        .code(500);
    }
  },

  // 2. Login untuk Admin atau Kasir (fungsi tidak berubah)
  login: async (request, h) => {
    try {
      const { username, password } = request.payload;
      if (!username || !password) {
        return h
          .response(createResponse(false, 'Username dan password harus diisi'))
          .code(400);
      }
      const admin = await Admin.findOne({
        where: { username },
        include: { model: Balance, as: 'balance' },
      });
      if (!admin) {
        return h
          .response(createResponse(false, 'Username tidak ditemukan'))
          .code(401);
      }
      const isValid = await admin.validPassword(password);
      if (!isValid) {
        return h.response(createResponse(false, 'Password salah')).code(401);
      }
      const token = generateAdminToken(admin);
      const adminResponse = { ...admin.toJSON() };
      delete adminResponse.password;
      return h
        .response(
          createResponse(true, 'Login berhasil', { user: adminResponse, token })
        )
        .code(200);
    } catch (error) {
      console.error('Error in login:', error);
      return h
        .response(
          createResponse(false, 'Terjadi kesalahan pada server', error.message)
        )
        .code(500);
    }
  },

  // 3. Login untuk Santri (fungsi tidak berubah)
  loginSantri: async (request, h) => {
    try {
      const { faceDescriptor } = request.payload;
      const FACE_RECOGNITION_THRESHOLD = 0.6;
      if (
        !faceDescriptor ||
        !Array.isArray(faceDescriptor) ||
        faceDescriptor.length !== 128
      ) {
        return Boom.badRequest(
          'faceDescriptor harus berupa array berisi 128 angka.'
        );
      }
      const allSantrisWithFaceId = await Santri.findAll({
        where: { FaceID: { [Op.ne]: null } },
      });
      let bestMatch = null;
      let minDistance = Infinity;
      for (const santri of allSantrisWithFaceId) {
        try {
          const storedDescriptor = JSON.parse(santri.FaceID);
          const distance = calculateEuclideanDistance(
            faceDescriptor,
            storedDescriptor
          );
          if (distance < minDistance) {
            minDistance = distance;
            bestMatch = santri;
          }
        } catch (e) {
          console.error(
            `Could not parse FaceID for santri ID ${santri.id}:`,
            santri.FaceID
          );
          continue;
        }
      }
      if (bestMatch && minDistance <= FACE_RECOGNITION_THRESHOLD) {
        const santriData = await Santri.findByPk(bestMatch.id, {
          include: [{ model: Balance, as: 'balance' }],
        });
        const token = generateSantriToken(santriData);
        return h
          .response(
            createResponse(true, 'Login santri berhasil', {
              user: santriData,
              token,
            })
          )
          .code(200);
      } else {
        return Boom.notFound('Wajah tidak dikenali atau tidak cocok.');
      }
    } catch (error) {
      console.error('Error in loginSantri:', error);
      return Boom.internal('Terjadi kesalahan pada server saat login santri.');
    }
  },

  // --- DAPATKAN SEMUA ADMIN/KASIR ---
  // Pengecekan role sudah tidak diperlukan di sini, karena sudah ditangani oleh 'scope' di rute.
  getAllAdmins: async (request, h) => {
    try {
      const users = await Admin.findAll({
        attributes: { exclude: ['password'] },
      });
      return h
        .response(
          createResponse(true, 'Berhasil mengambil daftar user', { users })
        )
        .code(200);
    } catch (error) {
      console.error('Error in getAllAdmins:', error);
      return Boom.internal(
        'Terjadi kesalahan pada server saat mengambil daftar user.'
      );
    }
  },

  // --- UPDATE ADMIN/KASIR ---
  // Pengecekan role sudah tidak diperlukan di sini, karena sudah ditangani oleh 'scope' di rute.
  updateAdmin: async (request, h) => {
    const { id } = request.params;
    const { username, password, role } = request.payload;
    const t = await sequelize.transaction();

    try {
      const targetAdmin = await Admin.findByPk(id);
      if (!targetAdmin) {
        return Boom.notFound('User tidak ditemukan.');
      }

      if (username && username !== targetAdmin.username) {
        const existingAdmin = await Admin.findOne({ where: { username } });
        if (existingAdmin) {
          return Boom.conflict('Username sudah terdaftar.');
        }
        targetAdmin.username = username;
      }

      if (password) {
        targetAdmin.password = password;
      }

      if (role) {
        if (!['admin', 'kasir'].includes(role)) {
          return Boom.badRequest(
            "Role tidak valid. Pilih 'admin' atau 'kasir'."
          );
        }
        targetAdmin.role = role;
      }

      await targetAdmin.save({ transaction: t });
      await t.commit();

      const adminResponse = { ...targetAdmin.toJSON() };
      delete adminResponse.password;

      return h
        .response(
          createResponse(true, 'Data user berhasil diperbarui.', {
            user: adminResponse,
          })
        )
        .code(200);
    } catch (error) {
      await t.rollback();
      console.error('Error in updateAdmin:', error);
      return Boom.internal(
        'Terjadi kesalahan pada server saat memperbarui user.'
      );
    }
  },

  // --- DELETE ADMIN/KASIR ---
  // Pengecekan role sudah tidak diperlukan di sini, karena sudah ditangani oleh 'scope' di rute.
  deleteAdmin: async (request, h) => {
    const { id } = request.params;
    const loggedInAdminId = request.auth.credentials.id;

    if (parseInt(id, 10) === loggedInAdminId) {
      return Boom.forbidden('Anda tidak dapat menghapus akun Anda sendiri.');
    }

    const t = await sequelize.transaction();

    try {
      const targetAdmin = await Admin.findByPk(id);
      if (!targetAdmin) {
        return Boom.notFound('User tidak ditemukan.');
      }

      await Balance.destroy({
        where: { ownerId: id, ownerType: 'admin' },
        transaction: t,
      });
      await targetAdmin.destroy({ transaction: t });
      await t.commit();

      return h
        .response(createResponse(true, 'User berhasil dihapus.'))
        .code(200);
    } catch (error) {
      await t.rollback();
      console.error('Error in deleteAdmin:', error);
      return Boom.internal(
        'Terjadi kesalahan pada server saat menghapus user.'
      );
    }
  },
};

module.exports = authController;
