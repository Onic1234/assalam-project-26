// controllers/customerController.js
const { PPMI, Staff, Santri, Member, Reguler, Balance } = require("../models"); // Menambahkan Balance
const Boom = require("@hapi/boom");

// ... (fungsi CRUD lainnya tetap sama)
exports.createCustomer = async (request, h) => {
  const { kategori } = request.params;
  const Model = getModel(kategori);
  if (!Model)
    return h.response({ message: "Kategori customer tidak valid." }).code(400);

  try {
    const data = { ...request.payload };
    delete data.FaceID;

    const customer = await Model.create(data);
    return h.response(customer).code(201);
  } catch (error) {
    return h
      .response({ message: "Gagal membuat customer.", error: error.message })
      .code(400);
  }
};

exports.getAllCustomers = async (request, h) => {
  const { kategori } = request.params;
  const Model = getModel(kategori);
  if (!Model) return Boom.badRequest("Kategori customer tidak valid.");

  try {
    const queryOptions = {};
    // Jika kategori adalah santri, sertakan data saldo
    if (kategori.toLowerCase() === "santri") {
      queryOptions.include = [
        {
          model: Balance,
          as: "balance",
          attributes: ["amount"],
        },
      ];
    }

    const customers = await Model.findAll(queryOptions);
    return h.response(customers).code(200);
  } catch (error) {
    console.error("Error getting all customers:", error);
    return Boom.internal("Gagal mengambil data customer.", error.message);
  }
};

exports.getCustomerById = async (request, h) => {
  const { kategori, id } = request.params;
  const Model = getModel(kategori);
  if (!Model) return Boom.badRequest("Kategori customer tidak valid.");

  try {
    const queryOptions = {};
    // Jika kategori adalah santri, sertakan data saldo
    if (kategori.toLowerCase() === "santri") {
      queryOptions.include = [
        {
          model: Balance,
          as: "balance",
          attributes: ["amount"],
        },
      ];
    }

    const customer = await Model.findByPk(id, queryOptions);
    if (!customer) return Boom.notFound("Customer tidak ditemukan.");
    return h.response(customer).code(200);
  } catch (error) {
    console.error("Error getting customer by ID:", error);
    return Boom.internal("Gagal mengambil data customer.", error.message);
  }
};

exports.updateCustomer = async (request, h) => {
  const { kategori, id } = request.params;
  const Model = getModel(kategori);
  if (!Model)
    return h.response({ message: "Kategori customer tidak valid." }).code(400);

  try {
    const customer = await Model.findByPk(id);
    if (!customer)
      return h.response({ message: "Customer tidak ditemukan." }).code(404);

    const data = { ...request.payload };
    delete data.FaceID;

    await customer.update(data);
    return h.response(customer).code(200);
  } catch (error) {
    return h
      .response({
        message: "Gagal memperbarui customer.",
        error: error.message,
      })
      .code(400);
  }
};

exports.deleteCustomer = async (request, h) => {
  const { kategori, id } = request.params;
  const Model = getModel(kategori);
  if (!Model)
    return h.response({ message: "Kategori customer tidak valid." }).code(400);

  try {
    const customer = await Model.findByPk(id);
    if (!customer)
      return h.response({ message: "Customer tidak ditemukan." }).code(404);

    await customer.destroy();
    return h.response({ message: "Customer berhasil dihapus." }).code(200);
  } catch (error) {
    return h
      .response({ message: "Gagal menghapus customer.", error: error.message })
      .code(500);
  }
};

/**
 * --- FUNGSI INI DIPERBARUI ---
 * Menyimpan Face Descriptor (array 128 angka) sebagai JSON string.
 */
exports.manageFaceId = async (request, h) => {
  const { kategori, id } = request.params;
  const { faceDescriptor } = request.payload; // Menerima array descriptor

  // Validasi dasar
  if (
    !faceDescriptor ||
    !Array.isArray(faceDescriptor) ||
    faceDescriptor.length !== 128
  ) {
    return Boom.badRequest(
      "faceDescriptor harus berupa array berisi 128 angka."
    );
  }

  const Model = getModel(kategori);
  if (![PPMI, Santri, Member].includes(Model)) {
    return Boom.badRequest("Kategori customer ini tidak mendukung FaceID.");
  }

  try {
    const customer = await Model.findByPk(id);
    if (!customer) return Boom.notFound("Customer tidak ditemukan.");

    // Simpan array sebagai JSON string
    customer.FaceID = JSON.stringify(faceDescriptor);
    await customer.save();

    return h
      .response({ message: `FaceID untuk customer ${id} berhasil diperbarui.` })
      .code(200);
  } catch (error) {
    console.error("Error managing FaceID:", error);
    return Boom.internal("Gagal memperbarui FaceID.");
  }
};

// Helper untuk mendapatkan model (jika belum ada)
const getModel = (kategori) => {
  const models = {
    ppmi: PPMI,
    staff: Staff,
    santri: Santri,
    member: Member,
    reguler: Reguler,
  };
  return models[kategori.toLowerCase()];
};
