// routes/settingRoutes.js
const settingController = require("../controllers/settingController");
const Joi = require("joi");

const settingRoutes = [
  {
    method: "POST",
    path: "/settings/qris",
    handler: settingController.uploadQrisImage,
    options: {
      auth: { scope: ["admin"] }, // Hanya admin yang bisa upload
      payload: {
        output: "data",
        parse: true,
        allow: "multipart/form-data",
        multipart: { output: "data" },
        maxBytes: 10 * 1024 * 1024, // Batas file 2MB
      },
    },
  },
  {
    method: "GET",
    path: "/settings/qris",
    handler: settingController.getQrisImage,
    options: {
      auth: false, // Publik, agar semua halaman pembayaran bisa mengakses
    },
  },
];

module.exports = settingRoutes;
