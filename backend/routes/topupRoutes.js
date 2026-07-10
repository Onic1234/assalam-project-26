// routes/topupRoutes.js
const topupController = require('../controllers/topupController');
const Joi = require('joi');

const topupRoutes = [
  // RUTE BARU: Untuk mencari santri berdasarkan nama (case-insensitive)
  {
    method: 'GET',
    // Parameter {nama} akan diambil dari URL
    path: '/santri/search/{nama}',
    handler: topupController.findSantriByName,
    options: {
      auth: { scope: ['admin', 'kasir'] },
      validate: {
        params: Joi.object({
          nama: Joi.string().min(2).required(),
        }),
      },
    },
  },

  {
    method: 'GET',
    path: '/test-search',
    handler: async (request, h) => {
      try {
        console.log('[TEST] Route accessed successfully');
        console.log('[TEST] Request query:', request.query);

        // Test database connection
        const { Santri } = require('../models');
        const count = await Santri.count();
        console.log('[TEST] Total santri in database:', count);

        // Test simple query
        const firstSantri = await Santri.findOne();
        console.log(
          '[TEST] First santri:',
          firstSantri ? firstSantri.toJSON() : 'No data'
        );

        return h.response({
          success: true,
          message: 'Test route working',
          data: {
            total_santri: count,
            first_santri: firstSantri ? firstSantri.toJSON() : null,
            query_received: request.query,
          },
        });
      } catch (error) {
        console.error('[TEST] Error:', error);
        return h
          .response({
            success: false,
            error: error.message,
            stack: error.stack,
          })
          .code(500);
      }
    },
    options: {
      auth: { scope: ['admin', 'kasir'] },
    },
  },

  // Route search yang sudah diperbaiki
  {
    method: 'GET',
    path: '/santri/search',
    handler: topupController.searchSantri,
    options: {
      auth: { scope: ['admin', 'kasir'] },
      validate: {
        query: Joi.object({
          q: Joi.string()
            .min(1)
            .required()
            .description('Query pencarian nama atau ID santri'),
          limit: Joi.number()
            .integer()
            .min(1)
            .max(50)
            .default(10)
            .description('Limit hasil pencarian'),
        }),
      },
    },
  },

  // RUTE BARU: Pencarian kartu member secara publik (tanpa token auth)
  {
    method: 'GET',
    path: '/public/member/search/{id_member}',
    handler: topupController.findMemberByIdMember,
    options: {
      auth: false, // Bebas akses untuk scanner self-service
      validate: {
        params: Joi.object({
          id_member: Joi.string().required(),
        }),
      },
    },
  },
  // RUTE BARU: Melakukan top-up kartu member secara publik (tanpa token auth)
  {
    method: 'POST',
    path: '/public/topup',
    handler: topupController.createPublicTopup,
    options: {
      auth: false, // Bebas akses untuk scanner self-service
      validate: {
        payload: Joi.object({
          id_member: Joi.string().required(),
          amount: Joi.number().positive().required(),
          payment_method: Joi.string().valid('QRIS', 'Tunai').optional(),
        }),
      },
    },
  },
  // RUTE LAMA: Untuk melakukan top-up oleh admin/kasir menggunakan ID database santri/member
  {
    method: 'POST',
    path: '/topup',
    handler: topupController.createTopup,
    options: {
      auth: { scope: ['admin', 'kasir'] },
      validate: {
        payload: Joi.object({
          santriId: Joi.number().integer().positive().optional(),
          memberId: Joi.number().integer().positive().optional(),
          amount: Joi.number().positive().required(),
        }).xor('santriId', 'memberId'),
      },
    },
  },
];

module.exports = topupRoutes;
