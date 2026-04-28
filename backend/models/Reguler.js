// models/Reguler.js
module.exports = (sequelize, DataTypes) => {
  const Reguler = sequelize.define(
    "Reguler",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      Nama: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      No_Telepon: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: "Regulers",
      timestamps: false,
    }
  );

  // --- Blok Asosiasi ---
  Reguler.associate = function (models) {
    Reguler.hasMany(models.Penjualan, {
      foreignKey: "CustomerId",
      constraints: false,
      scope: {
        Kategori: "Reguler", // Menandakan bahwa penjualan ini untuk Reguler
      },
    });
  };

  return Reguler;
};
