// routes/importSantriRoutes.js
const {
  importSantri,
  downloadTemplate,
  getAllSantri,
} = require("../controllers/importSantriController");

const routes = [
  {
    method: "POST",
    path: "/santri-management/import",
    handler: importSantri,
    options: {
      auth: {
        scope: ["admin"], // Hanya admin yang bisa impor
      },
      payload: {
        output: "data", // Menginstruksikan Hapi untuk memberikan file sebagai buffer
        parse: true,
        allow: "multipart/form-data",
        multipart: { output: "data" },
        maxBytes: 10 * 1024 * 1024, // Contoh batas ukuran file: 10MB
      },
    },
  },
  {
    method: "GET",
    path: "/santri-management/template",
    handler: downloadTemplate,
  },
  {
    method: "GET",
    path: "/santri-management",
    handler: getAllSantri,
    options: {
      auth: {
        scope: ["admin"], // Hanya admin yang bisa melihat daftar semua santri
      },
    },
  },
];

module.exports = routes;
