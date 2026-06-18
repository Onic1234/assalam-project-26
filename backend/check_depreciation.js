const { Asset } = require('./models');

async function run() {
  const assets = await Asset.findAll();
  
  let totalWithPrice = 0;
  let totalPrice = 0;
  
  assets.forEach(asset => {
    const price = parseFloat(asset.harga_perolehan);
    if (!isNaN(price) && price > 0) {
      totalWithPrice++;
      totalPrice += price;
    }
  });
  
  console.log(`Assets with price: ${totalWithPrice}/${assets.length}`);
  console.log(`Total Price Sum: ${totalPrice}`);
}

run().catch(console.error);
