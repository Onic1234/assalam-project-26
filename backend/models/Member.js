// models/Member.js
module.exports = (sequelize, DataTypes) => {
  const Member = sequelize.define(
    "Member",
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
        unique: true,
      },
      Tanggal_Kadaluarsa: {
        type: DataTypes.DATE,
        allowNull: false,
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
    },
    {
      tableName: "Members",
      timestamps: false,
    }
  );

  // --- Blok Asosiasi ---
  Member.associate = function (models) {
    Member.hasMany(models.Penjualan, {
      foreignKey: "CustomerId",
      constraints: false,
      scope: {
        Kategori: "Member", // Menandakan bahwa penjualan ini untuk Member
      },
    });
  };

  return Member;
};
