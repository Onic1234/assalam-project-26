// controllers/ticketPriceController.js
const { TicketPrice } = require("../models");

exports.setTicketPrice = async (request, h) => {
  // --- PEMBARUAN ---
  // Ambil `discountPercentage` dari payload. Beri nilai default 0 jika tidak ada.
  const { kategori, harga, discountPercentage = 0 } = request.payload;
  // --- AKHIR PEMBARUAN ---

  if (!["Reguler", "Staff"].includes(kategori)) {
    return h
      .response({ message: "Kategori hanya bisa Reguler atau Staff." })
      .code(400);
  }

  try {
    // --- PEMBARUAN ---
    // Sertakan `discountPercentage` dalam operasi upsert (update atau insert).
    const [price, created] = await TicketPrice.upsert({
      kategori,
      harga,
      discountPercentage,
    });
    // --- AKHIR PEMBARUAN ---

    return h
      .response({
        message: `Harga dan diskon tiket untuk ${kategori} berhasil diatur.`, // Pesan diperbarui
        data: price,
      })
      .code(200);
  } catch (error) {
    return h
      .response({
        message: "Gagal mengatur harga tiket.",
        error: error.message,
      })
      .code(500);
  }
};

exports.getTicketPrices = async (request, h) => {
  try {
    const prices = await TicketPrice.findAll();
    return h.response(prices).code(200);
  } catch (error) {
    return h
      .response({
        message: "Gagal mengambil data harga tiket.",
        error: error.message,
      })
      .code(500);
  }
};
