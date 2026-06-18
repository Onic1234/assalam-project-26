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

// Helper to generate initials-based item code (e.g., Kunci Motor -> KM-001)
const generateItemCode = async (nama_barang) => {
  if (!nama_barang) return "BRG-001";
  
  // Extract words
  const words = nama_barang.trim().split(/\s+/);
  let prefix = "";
  
  if (words.length === 1) {
    // Single word, take first 3 letters
    prefix = words[0].substring(0, 3).toUpperCase();
  } else {
    // Multiple words, take first letter of each word
    prefix = words.map(w => w[0]).join("").substring(0, 4).toUpperCase();
  }
  
  // Clean prefix to keep only alphanumeric
  prefix = prefix.replace(/[^A-Z0-9]/g, "");
  if (!prefix) prefix = "BRG";

  // Find existing items with this prefix to get the next counter
  const { count } = await LostItem.findAndCountAll({
    where: {
      kode_barang: {
        [Op.like]: `${prefix}%`
      }
    }
  });

  return `${prefix}-${String(count + 1).padStart(3, '0')}`;
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
        kode_barang,
        petugas_input,
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

      let base64Ktp = null;
      if (request.payload.foto_ktp) {
        if (Buffer.isBuffer(request.payload.foto_ktp)) {
          const mimeType = getMimeTypeFromBuffer(request.payload.foto_ktp) || "image/jpeg";
          base64Ktp = `data:${mimeType};base64,${request.payload.foto_ktp.toString("base64")}`;
        } else if (typeof request.payload.foto_ktp === "string") {
          base64Ktp = request.payload.foto_ktp;
        }
      }

      let code = kode_barang;
      if (!code || !code.trim()) {
        code = await generateItemCode(nama_barang);
      } else {
        code = code.trim();
      }

      let petugasInput = petugas_input;
      if (!petugasInput || !petugasInput.trim()) {
        petugasInput = request.auth && request.auth.credentials ? request.auth.credentials.username : null;
      }

      const newItem = await LostItem.create({
        nama_barang: nama_barang ? nama_barang.trim() : "",
        deskripsi: deskripsi ? deskripsi.trim() : null,
        tanggal_ditemukan,
        lokasi_ditemukan: lokasi_ditemukan ? lokasi_ditemukan.trim() : null,
        status,
        foto_barang: base64Image,
        kode_barang: code,
        foto_ktp: base64Ktp,
        petugas_input: petugasInput ? petugasInput.trim() : null,
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
        kode_barang,
        petugas_input,
        petugas_klaim,
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

      let base64Ktp = item.foto_ktp;
      if (request.payload.foto_ktp) {
        if (Buffer.isBuffer(request.payload.foto_ktp)) {
          const mimeType = getMimeTypeFromBuffer(request.payload.foto_ktp) || "image/jpeg";
          base64Ktp = `data:${mimeType};base64,${request.payload.foto_ktp.toString("base64")}`;
        } else if (typeof request.payload.foto_ktp === "string") {
          base64Ktp = request.payload.foto_ktp;
        }
      } else if (request.payload.foto_ktp === null || request.payload.foto_ktp === "") {
        base64Ktp = null;
      }

      const updates = {};
      if (nama_barang !== undefined) updates.nama_barang = nama_barang.trim();
      if (deskripsi !== undefined) updates.deskripsi = deskripsi ? deskripsi.trim() : null;
      if (tanggal_ditemukan !== undefined) updates.tanggal_ditemukan = tanggal_ditemukan;
      if (lokasi_ditemukan !== undefined) updates.lokasi_ditemukan = lokasi_ditemukan ? lokasi_ditemukan.trim() : null;
      if (status !== undefined) updates.status = status;
      if (kode_barang !== undefined) updates.kode_barang = kode_barang ? kode_barang.trim() : null;
      if (petugas_input !== undefined) updates.petugas_input = petugas_input ? petugas_input.trim() : null;
      if (request.payload.foto_barang !== undefined) updates.foto_barang = base64Image;
      if (request.payload.foto_ktp !== undefined) updates.foto_ktp = base64Ktp;

      // Handle claim updates if status is changed to Claimed
      if (status === "Claimed") {
        updates.nama_pemilik = nama_pemilik ? nama_pemilik.trim() : null;
        updates.nomor_telepon_pemilik = nomor_telepon_pemilik ? nomor_telepon_pemilik.trim() : null;
        updates.tanggal_diambil = tanggal_diambil || new Date().toISOString(); // default to current time if not provided
        
        let petugasKlaim = petugas_klaim;
        if (!petugasKlaim || !petugasKlaim.trim()) {
          petugasKlaim = request.auth && request.auth.credentials ? request.auth.credentials.username : null;
        }
        updates.petugas_klaim = petugasKlaim ? petugasKlaim.trim() : null;
        
        if (request.payload.foto_ktp !== undefined) {
          updates.foto_ktp = base64Ktp;
        }
      } else if (status === "Lost") {
        // If status reset back to Lost, reset claim fields
        updates.nama_pemilik = null;
        updates.nomor_telepon_pemilik = null;
        updates.tanggal_diambil = null;
        updates.foto_ktp = null;
        updates.petugas_klaim = null;
      } else {
        if (nama_pemilik !== undefined) updates.nama_pemilik = nama_pemilik ? nama_pemilik.trim() : null;
        if (nomor_telepon_pemilik !== undefined) updates.nomor_telepon_pemilik = nomor_telepon_pemilik ? nomor_telepon_pemilik.trim() : null;
        if (tanggal_diambil !== undefined) updates.tanggal_diambil = tanggal_diambil || null;
        if (petugas_klaim !== undefined) updates.petugas_klaim = petugas_klaim ? petugas_klaim.trim() : null;
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
