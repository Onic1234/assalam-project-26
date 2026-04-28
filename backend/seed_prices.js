const { TicketPrice } = require('./models');

async function seed() {
  try {
    await TicketPrice.bulkCreate([
      { kategori: 'Reguler', harga: 20000, discountPercentage: 0 },
      { kategori: 'Staff', harga: 15000, discountPercentage: 10 }
    ], { updateOnDuplicate: ['harga', 'discountPercentage'] });
    console.log('TicketPrices seeded successfully');
  } catch (err) {
    console.error('Error seeding TicketPrices:', err);
  }
}

seed();
