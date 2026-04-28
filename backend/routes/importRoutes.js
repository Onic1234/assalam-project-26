// routes/importRoutes.js
const importController = require("../controllers/importController");
const Joi = require("joi");

const validKategori = ["santri", "ppmi", "staff", "member"];

const routes = [
  {
    method: "POST",
    path: "/import/{kategori}",
    handler: importController.importData,
    options: {
      auth: {
        scope: ["admin"], // Hanya admin yang bisa impor
      },
      payload: {
        output: "data",
        parse: true,
        allow: "multipart/form-data",
        multipart: { output: "data" },
        maxBytes: 10 * 1024 * 1024, // 10MB limit
      },
      validate: {
        params: Joi.object({
          kategori: Joi.string()
            .valid(...validKategori)
            .required(),
        }),
      },
    },
  },
  {
    method: "GET",
    path: "/import/template/{kategori}",
    handler: importController.downloadTemplate,
    options: {
      auth: false,
      validate: {
        params: Joi.object({
          kategori: Joi.string()
            .valid(...validKategori)
            .required(),
        }),
      },
    },
  },
];

module.exports = routes;
