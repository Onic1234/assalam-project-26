// models/PPMI.js
module.exports = (sequelize, DataTypes) => {
  const PPMI = sequelize.define(
    "PPMI",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      Username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      FaceID: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      Dibuat: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      Login_Terakhir: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "PPMIs",
      timestamps: false,
    }
  );

  // --- Blok Asosiasi ---
  PPMI.associate = function (models) {
    PPMI.hasMany(models.Penjualan, {
      foreignKey: "CustomerId",
      constraints: false,
      scope: {
        Kategori: "PPMI",
      },
    });
  };

  return PPMI;
};
