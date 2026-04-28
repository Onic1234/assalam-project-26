const historyController = require("../controllers/historyController");
const Joi = require("joi");

const historyRoutes = [
  // CREATE
  {
    method: "POST",
    path: "/history",
    handler: historyController.processHistory,
    options: {
      auth: { scope: ["admin", "kasir"] }, // Hanya user terautentikasi (kasir/admin) yang bisa top-up
      validate: {
        payload: Joi.object({
          NFCId: Joi.string().required(),
          totalPrice: Joi.number().integer().positive().required(),
          productId: Joi.number().integer().positive().required(),
        }),
      },
    },
  },

  // READ - Get all history
  {
    method: "GET",
    path: "/history",
    handler: historyController.getAllHistory,
    options: {
      auth: { scope: ["admin", "kasir"] }, // Hanya user terautentikasi (kasir/admin) yang bisa top-up
    },
  },

  // READ - Get history by ID
  {
    method: "GET",
    path: "/history/{id}",
    handler: historyController.getHistoryById,
    options: {
      auth: { scope: ["admin", "kasir"] }, // Hanya user terautentikasi (kasir/admin) yang bisa top-up
      validate: {
        params: Joi.object({
          id: Joi.number().integer().positive().required(),
        }),
      },
    },
  },

  // READ - Get history by user
  {
    method: "GET",
    path: "/history/user/{userId}",
    handler: historyController.getHistoryByUser,
    options: {
      auth: { scope: ["admin", "kasir"] }, // Hanya user terautentikasi (kasir/admin) yang bisa top-up
      validate: {
        params: Joi.object({
          userId: Joi.number().integer().positive().required(),
        }),
      },
    },
  },

  // UPDATE
  {
    method: "PUT",
    path: "/history/{id}",
    handler: historyController.updateHistory,
    options: {
      auth: { scope: ["admin", "kasir"] }, // Hanya user terautentikasi (kasir/admin) yang bisa top-up
      validate: {
        params: Joi.object({
          id: Joi.number().integer().positive().required(),
        }),
        payload: Joi.object({
          description: Joi.string().required().min(1).max(255),
        }),
      },
    },
  },

  // DELETE
  {
    method: "DELETE",
    path: "/history/{id}",
    handler: historyController.deleteHistory,
    options: {
      auth: { scope: ["admin", "kasir"] }, // Hanya user terautentikasi (kasir/admin) yang bisa top-up
      validate: {
        params: Joi.object({
          id: Joi.number().integer().positive().required(),
        }),
      },
    },
  },
];

module.exports = historyRoutes;
