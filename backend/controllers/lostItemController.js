// controllers/lostItemController.js
const { LostItem } = require("../models");
const { Op } = require("sequelize");
const sequelize = require("sequelize");

// Helper function for response format
const sendResponse = (h, status, success, message, data = null) => {
  return h
    .response({
      success,
      message,
      data,
    })
    .code(status);
};

// Helper function to detect MIME type from buffer
const getMimeTypeFromBuffer = (buffer) => {
  if (buffer.length < 4) return null;
  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  // JPEG/JPG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  // GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return "image/gif";
  }
  // WebP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  ) {
    return "image/webp";
  }
  return null;
};

const lostItemController = {
  // 1. Create Lost Item
  createLostItem: async (request, h) => {
    try {
      const {
        nama_barang,
        deskripsi,
        tanggal_ditemukan,
        lokasi_ditemukan,
        status = "Lost",
        nama_pemilik,
        nomor_telepon_pemilik,
        tanggal_diambil,
      } = request.payload;

      let base64Image = null;
      if (request.payload.foto_barang) {
        if (Buffer.isBuffer(request.payload.foto_barang)) {
          const mimeType = getMimeTypeFromBuffer(request.payload.foto_barang) || "image/jpeg";
          base64Image = `data:${mimeType};base64,${request.payload.foto_barang.toString("base64")}`;
        } else if (typeof request.payload.foto_barang === "string") {
          base64Image = request.payload.foto_barang;
        }
      }

      const newItem = await LostItem.create({
        nama_barang: nama_barang ? nama_barang.trim() : "",
        deskripsi: deskripsi ? deskripsi.trim() : null,
        tanggal_ditemukan,
        lokasi_ditemukan: lokasi_ditemukan ? lokasi_ditemukan.trim() : null,
        status,
        foto_barang: base64Image,
        nama_pemilik: nama_pemilik ? nama_pemilik.trim() : null,
        nomor_telepon_pemilik: nomor_telepon_pemilik ? nomor_telepon_pemilik.trim() : null,
        tanggal_diambil: tanggal_diambil || null,
      });

      return sendResponse(h, 201, true, "Barang temuan berhasil dicatat", newItem);
    } catch (error) {
      console.error("Error in createLostItem:", error);
      return sendResponse(h, 500, false, "Terjadi kesalahan server", error.message);
    }
  },

  // 2. Get All Lost Items
  getAllLostItems: async (request, h) => {
    try {
      const {
        search = "",
        status = "",
      } = request.query;

      const whereClause = {};

      if (status) {
        whereClause.status = status;
      }

      if (search) {
        whereClause[Op.or] = [
          {
            nama_barang: {
              [Op.like]: `%${search}%`,
            },
          },
          {
            deskripsi: {
              [Op.like]: `%${search}%`,
            },
          },
          {
            lokasi_ditemukan: {
              [Op.like]: `%${search}%`,
            },
          },
        ];
      }

      const items = await LostItem.findAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
      });

      return sendResponse(h, 200, true, "Data barang temuan berhasil diambil", items);
    } catch (error) {
      console.error("Error in getAllLostItems:", error);
      return sendResponse(h, 500, false, "Terjadi kesalahan server", error.message);
    }
  },

  // 3. Get Lost Item By ID
  getLostItemById: async (request, h) => {
    try {
      const { id } = request.params;
      const item = await LostItem.findByPk(id);

      if (!item) {
        return sendResponse(h, 404, false, "Barang temuan tidak ditemukan");
      }

      return sendResponse(h, 200, true, "Detail barang temuan berhasil diambil", item);
    } catch (error) {
      console.error("Error in getLostItemById:", error);
      return sendResponse(h, 500, false, "Terjadi kesalahan server", error.message);
    }
  },

  // 4. Update Lost Item (Claim / Edit)
  updateLostItem: async (request, h) => {
    try {
      const { id } = request.params;
      const item = await LostItem.findByPk(id);

      if (!item) {
        return sendResponse(h, 404, false, "Barang temuan tidak ditemukan");
      }

      const {
        nama_barang,
        deskripsi,
        tanggal_ditemukan,
        lokasi_ditemukan,
        status,
        nama_pemilik,
        nomor_telepon_pemilik,
        tanggal_diambil,
      } = request.payload;

      let base64Image = item.foto_barang;
      if (request.payload.foto_barang) {
        if (Buffer.isBuffer(request.payload.foto_barang)) {
          const mimeType = getMimeTypeFromBuffer(request.payload.foto_barang) || "image/jpeg";
          base64Image = `data:${mimeType};base64,${request.payload.foto_barang.toString("base64")}`;
        } else if (typeof request.payload.foto_barang === "string") {
          base64Image = request.payload.foto_barang;
        }
      }

      const updates = {};
      if (nama_barang !== undefined) updates.nama_barang = nama_barang.trim();
      if (deskripsi !== undefined) updates.deskripsi = deskripsi ? deskripsi.trim() : null;
      if (tanggal_ditemukan !== undefined) updates.tanggal_ditemukan = tanggal_ditemukan;
      if (lokasi_ditemukan !== undefined) updates.lokasi_ditemukan = lokasi_ditemukan ? lokasi_ditemukan.trim() : null;
      if (status !== undefined) updates.status = status;
      if (request.payload.foto_barang !== undefined) updates.foto_barang = base64Image;

      // Handle claim updates if status is changed to Claimed
      if (status === "Claimed") {
        updates.nama_pemilik = nama_pemilik ? nama_pemilik.trim() : null;
        updates.nomor_telepon_pemilik = nomor_telepon_pemilik ? nomor_telepon_pemilik.trim() : null;
        updates.tanggal_diambil = tanggal_diambil || new Date().toISOString().split("T")[0]; // default to today if not provided
      } else if (status === "Lost") {
        // If status reset back to Lost, reset claim fields
        updates.nama_pemilik = null;
        updates.nomor_telepon_pemilik = null;
        updates.tanggal_diambil = null;
      } else {
        if (nama_pemilik !== undefined) updates.nama_pemilik = nama_pemilik ? nama_pemilik.trim() : null;
        if (nomor_telepon_pemilik !== undefined) updates.nomor_telepon_pemilik = nomor_telepon_pemilik ? nomor_telepon_pemilik.trim() : null;
        if (tanggal_diambil !== undefined) updates.tanggal_diambil = tanggal_diambil || null;
      }

      await item.update(updates);

      return sendResponse(h, 200, true, "Data barang temuan berhasil diperbarui", item);
    } catch (error) {
      console.error("Error in updateLostItem:", error);
      return sendResponse(h, 500, false, "Terjadi kesalahan server", error.message);
    }
  },

  // 5. Delete Lost Item
  deleteLostItem: async (request, h) => {
    try {
      const { id } = request.params;
      const item = await LostItem.findByPk(id);

      if (!item) {
        return sendResponse(h, 404, false, "Barang temuan tidak ditemukan");
      }

      await item.destroy();

      return sendResponse(h, 200, true, "Barang temuan berhasil dihapus", item);
    } catch (error) {
      console.error("Error in deleteLostItem:", error);
      return sendResponse(h, 500, false, "Terjadi kesalahan server", error.message);
    }
  },
};

module.exports = lostItemController;
