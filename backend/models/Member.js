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
      id_member: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      Nama: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      Jenis_Kelamin: {
        type: DataTypes.ENUM("L", "P"),
        allowNull: true,
      },
      Jenis_Member: {
        type: DataTypes.STRING,
        allowNull: true,
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
      tableName: "members",
      timestamps: false,
      hooks: {
        beforeCreate: async (member, options) => {
          if (!member.id_member || member.id_member.trim() === "") {
            const now = new Date();
            const year = String(now.getFullYear()).slice(-2);
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const prefix = `MBR${year}${month}`;

            const { Member } = member.sequelize.models;
            const lastMember = await Member.findOne({
              where: {
                id_member: {
                  [sequelize.Sequelize.Op.like]: `${prefix}%`
                }
              },
              order: [['id_member', 'DESC']],
            });

            let nextNum = 1;
            if (lastMember && lastMember.id_member) {
              const numericPart = lastMember.id_member.slice(prefix.length);
              const parsed = parseInt(numericPart, 10);
              if (!isNaN(parsed)) {
                nextNum = parsed + 1;
              }
            }
            member.id_member = `${prefix}${String(nextNum).padStart(5, '0')}`;
          }
        },
        beforeBulkCreate: async (members, options) => {
          const now = new Date();
          const year = String(now.getFullYear()).slice(-2);
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const prefix = `MBR${year}${month}`;
          
          const { Member } = sequelize.models;
          const lastMember = await Member.findOne({
            where: {
              id_member: {
                [sequelize.Sequelize.Op.like]: `${prefix}%`
              }
            },
            order: [['id_member', 'DESC']],
          });

          let nextNum = 1;
          if (lastMember && lastMember.id_member) {
            const numericPart = lastMember.id_member.slice(prefix.length);
            const parsed = parseInt(numericPart, 10);
            if (!isNaN(parsed)) {
              nextNum = parsed + 1;
            }
          }

          for (const member of members) {
            if (!member.id_member || member.id_member.trim() === "") {
              member.id_member = `${prefix}${String(nextNum).padStart(5, '0')}`;
              nextNum++;
            }
          }
        },
        afterCreate: async (member, options) => {
          const { Balance } = member.sequelize.models;
          await Balance.create({
            ownerId: member.id,
            ownerType: "member",
            amount: 0,
          });
        },
        afterBulkCreate: async (members, options) => {
          if (options.individualHooks) return;
          const { Balance } = sequelize.models;
          const balancesToCreate = members.map((member) => ({
            ownerId: member.id,
            ownerType: "member",
            amount: 0,
          }));
          await Balance.bulkCreate(balancesToCreate);
        },
      },
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

    Member.hasOne(models.Balance, {
      foreignKey: "ownerId",
      constraints: false,
      scope: { ownerType: "member" },
      as: "balance",
    });
  };

  return Member;
};

