// routes/customerRoutes.js
const customerController = require("../controllers/customerController");
const Joi = require("joi");

const routes = [
  // CRUD untuk semua jenis customer
  {
    method: ["POST", "GET", "PUT", "DELETE"],
    path: "/customers/{kategori}/{id?}", // Menggabungkan rute untuk efisiensi
    handler: (request, h) => {
      if (request.params.id) {
        if (request.method === "get")
          return customerController.getCustomerById(request, h);
        if (request.method === "put")
          return customerController.updateCustomer(request, h);
        if (request.method === "delete")
          return customerController.deleteCustomer(request, h);
      }
      if (request.method === "post")
        return customerController.createCustomer(request, h);
      return customerController.getAllCustomers(request, h);
    },
    options: {
      auth: {
        scope: ["admin"], // Hanya admin yang bisa mengelola semua data customer
      },
    },
  },

  // Manajemen FaceID
  {
    method: "POST",
    path: "/customers/{kategori}/{id}/faceid",
    handler: customerController.manageFaceId,
    options: {
      auth: {
        scope: ["admin"], // Hanya admin yang bisa mengelola FaceID
      },
      validate: {
        payload: Joi.object({
          // Validasi diubah menjadi array berisi 128 angka
          faceDescriptor: Joi.array()
            .items(Joi.number())
            .length(128)
            .required(),
        }),
      },
    },
  },
];

module.exports = routes;
