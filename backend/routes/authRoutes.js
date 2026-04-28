const authController = require('../controllers/authController');
const Joi = require('joi');

const routes = [
  // Rute untuk mendaftarkan Admin atau Kasir baru
  // Disederhanakan karena sudah ada auth.default
  {
    method: 'POST',
    path: '/auth/register',
    handler: authController.register,
    options: {
      auth: {
        scope: ['admin'], // Hanya admin yang bisa mendaftarkan user baru
      },
      validate: {
        payload: Joi.object({
          username: Joi.string().required(),
          password: Joi.string().required(),
          role: Joi.string().valid('admin', 'kasir').required(),
        }),
      },
    },
  },

  // Rute untuk login Admin atau Kasir
  {
    method: 'POST',
    path: '/auth/login',
    handler: authController.login,
    options: {
      auth: false,
      validate: {
        payload: Joi.object({
          username: Joi.string().required(),
          password: Joi.string().required(),
        }),
      },
    },
  },

  // Rute untuk login Santri via FaceID
  {
    method: 'POST',
    path: '/auth/login/santri',
    handler: authController.loginSantri,
    options: {
      auth: false,
      validate: {
        payload: Joi.object({
          faceDescriptor: Joi.array()
            .items(Joi.number())
            .length(128)
            .required(),
        }),
      },
    },
  },

  // Rute untuk mendapatkan daftar semua Admin/Kasir
  // Disederhanakan karena sudah ada auth.default
  {
    method: 'GET',
    path: '/auth/admins',
    handler: authController.getAllAdmins,
    options: {
      auth: {
        scope: ['admin'], // Hanya admin yang bisa melihat daftar user
      },
    },
  },

  // Rute untuk memperbarui Admin/Kasir
  // Disederhanakan karena sudah ada auth.default
  {
    method: 'PUT',
    path: '/auth/admin/{id}',
    handler: authController.updateAdmin,
    options: {
      auth: {
        scope: ['admin'], // Hanya admin yang bisa memperbarui user
      },
      validate: {
        params: Joi.object({
          id: Joi.number().integer().required(),
        }),
        payload: Joi.object({
          username: Joi.string().min(3).optional(),
          password: Joi.string().min(6).optional(),
          role: Joi.string().valid('admin', 'kasir').optional(),
        }).min(1),
      },
    },
  },

  // Rute untuk menghapus Admin/Kasir
  // Disederhanakan karena sudah ada auth.default
  {
    method: 'DELETE',
    path: '/auth/admin/{id}',
    handler: authController.deleteAdmin,
    options: {
      auth: {
        scope: ['admin'], // Hanya admin yang bisa menghapus user
      },
      validate: {
        params: Joi.object({
          id: Joi.number().integer().required(),
        }),
      },
    },
  },
];

module.exports = routes;
