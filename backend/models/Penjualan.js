// models/Penjualan.js
module.exports = (sequelize, DataTypes) => {
  const Penjualan = sequelize.define(
    "Penjualan",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      CustomerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      Tanggal_Kunjungan: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      Kategori: {
        type: DataTypes.ENUM("Reguler", "PPMI", "Santri", "Member", "Staff"),
        allowNull: false,
      },
      Kuantitas: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      Metode_Pembayaran: {
        type: DataTypes.ENUM("Tunai", "QRIS"),
        allowNull: true,
      },
    },
    {
      tableName: "Penjualans",
      timestamps: true,
    }
  );

  // --- Blok Asosiasi (Relasi) ---
  Penjualan.associate = function (models) {
    Penjualan.belongsTo(models.PPMI, {
      foreignKey: "CustomerId",
      constraints: false,
    });
    Penjualan.belongsTo(models.Staff, {
      foreignKey: "CustomerId",
      constraints: false,
    });
    Penjualan.belongsTo(models.Santri, {
      foreignKey: "CustomerId",
      constraints: false,
    });
    Penjualan.belongsTo(models.Member, {
      foreignKey: "CustomerId",
      constraints: false,
    });
    Penjualan.belongsTo(models.Reguler, {
      foreignKey: "CustomerId",
      constraints: false,
    });
  };

  return Penjualan;
};
