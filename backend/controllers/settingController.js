// controllers/settingController.js
const { Setting } = require("../models");
const Boom = require("@hapi/boom");

// Helper function untuk mendeteksi tipe MIME dari buffer
const getMimeTypeFromBuffer = (buffer) => {
  if (buffer.length < 4) return null;
  // Cek "magic numbers" untuk PNG (‰PNG)
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  // Cek "magic numbers" untuk JPEG (ÿØÿ)
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  return null; // Tipe tidak dikenal
};

const settingController = {
  /**
   * Mengunggah atau memperbarui gambar QRIS.
   * Gambar disimpan sebagai data URL Base64.
   */
  uploadQrisImage: async (request, h) => {
    try {
      const fileBuffer = request.payload.file;
      if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
        return Boom.badRequest("File gambar harus diunggah.");
      }

      // --- LOGIKA DIPERBARUI ---
      // Mendeteksi tipe MIME langsung dari buffer file
      const mimeType = getMimeTypeFromBuffer(fileBuffer);

      if (!mimeType) {
        return Boom.badRequest(
          "Format file tidak didukung atau file rusak. Harap unggah PNG atau JPG."
        );
      }

      // Konversi buffer ke Base64 data URL
      const base64Image = `data:${mimeType};base64,${fileBuffer.toString(
        "base64"
      )}`;

      // Simpan ke database menggunakan upsert (update or insert)
      await Setting.upsert({
        key: "qris_image",
        value: base64Image,
      });

      return h
        .response({
          success: true,
          message: "Gambar QRIS berhasil diperbarui.",
        })
        .code(200);
    } catch (error) {
      console.error("Error uploading QRIS image:", error);
      return Boom.internal("Gagal mengunggah gambar QRIS.");
    }
  },

  /**
   * Mengambil gambar QRIS yang tersimpan.
   */
  getQrisImage: async (request, h) => {
    try {
      const qrisSetting = await Setting.findByPk("qris_image");

      if (!qrisSetting) {
        return Boom.notFound("Gambar QRIS belum diatur.");
      }

      return h
        .response({
          success: true,
          data: {
            key: qrisSetting.key,
            value: qrisSetting.value, // Ini adalah data URL Base64
          },
        })
        .code(200);
    } catch (error) {
      console.error("Error getting QRIS image:", error);
      return Boom.internal("Gagal mengambil gambar QRIS.");
    }
  },
};

module.exports = settingController;
