// controllers/assetController.js
const { Asset } = require("../models");
const { Op } = require("sequelize");

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

const assetController = {
  // 1. Get All Assets with filtering & pagination
  getAllAssets: async (request, h) => {
    try {
      const {
        search = "",
        lokasi = "",
        kategori = "",
        tahun_perolehan = "",
        bulan_maintenance = "",
        status_maintenance = "",
        page = 1,
        limit = 10,
      } = request.query;

      const whereClause = {};

      if (lokasi) {
        whereClause.lokasi = lokasi;
      }

      if (kategori) {
        whereClause.kategori = kategori;
      }

      if (tahun_perolehan) {
        whereClause.tahun_perolehan = parseInt(tahun_perolehan);
      }

      if (status_maintenance) {
        whereClause.status_maintenance = status_maintenance;
      }

      if (search) {
        whereClause[Op.or] = [
          {
            nama: {
              [Op.like]: `%${search}%`,
            },
          },
          {
            kode: {
              [Op.like]: `%${search}%`,
            },
          },
          {
            vendor: {
              [Op.like]: `%${search}%`,
            },
          },
        ];
      }

      // Fetch assets matching database filters
      let assets = await Asset.findAll({
        where: whereClause,
        order: [["id", "ASC"]],
      });

      // Filter by maintenance month in memory since it's a JSON array
      if (bulan_maintenance) {
        assets = assets.filter((asset) => {
          let months = asset.scheduled_months;
          if (typeof months === 'string') {
            try {
              months = JSON.parse(months);
            } catch {
              months = [];
            }
          }
          return Array.isArray(months) && months.includes(bulan_maintenance);
        });
      }

      // Apply pagination on the filtered results
      const totalItems = assets.length;
      const parsedPage = parseInt(page);
      const parsedLimit = parseInt(limit);
      const totalPages = Math.ceil(totalItems / parsedLimit);
      const offset = (parsedPage - 1) * parsedLimit;
      
      const paginatedAssets = assets.slice(offset, offset + parsedLimit);

      return sendResponse(h, 200, true, "Data aset berhasil diambil", {
        assets: paginatedAssets,
        totalItems,
        totalPages,
        currentPage: parsedPage,
        limit: parsedLimit,
      });
    } catch (error) {
      console.error("Error in getAllAssets:", error);
      return sendResponse(h, 500, false, "Terjadi kesalahan server", error.message);
    }
  },

  // 2. Get Asset Stats for Dashboard
  getAssetStats: async (request, h) => {
    try {
      const allAssets = await Asset.findAll();
      
      const totalAssets = allAssets.length;
      
      // Calculate count of assets needing maintenance (Pending status)
      const needsMaintenance = allAssets.filter(
        (a) => a.status_maintenance === "Pending"
      ).length;

      // Calculate Top Location
      const locationCounts = {};
      const categoryCounts = {
        Utility: 0,
        Furniture: 0,
        Mekanikal: 0,
        Elektronik: 0,
        Mesin: 0,
      };
      
      const monthlyMaintenanceCounts = {
        Januari: 0, Februari: 0, Maret: 0, April: 0, Mei: 0, Juni: 0,
        Juli: 0, Agustus: 0, September: 0, Oktober: 0, November: 0, Desember: 0
      };

      allAssets.forEach((asset) => {
        // Location
        const loc = asset.lokasi || "Unknown";
        locationCounts[loc] = (locationCounts[loc] || 0) + 1;
        
        // Category
        const cat = asset.kategori;
        if (categoryCounts[cat] !== undefined) {
          categoryCounts[cat]++;
        } else if (cat) {
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        }

        // Maintenance schedules
        let months = asset.scheduled_months;
        if (typeof months === 'string') {
          try {
            months = JSON.parse(months);
          } catch {
            months = [];
          }
        }
        if (Array.isArray(months)) {
          months.forEach((m) => {
            if (monthlyMaintenanceCounts[m] !== undefined) {
              monthlyMaintenanceCounts[m]++;
            }
          });
        }
      });

      // Find top location
      let topLocation = "N/A";
      let maxLocCount = 0;
      Object.entries(locationCounts).forEach(([loc, count]) => {
        if (count > maxLocCount) {
          maxLocCount = count;
          topLocation = loc;
        }
      });

      // Format locations count
      const assetsPerLocation = Object.entries(locationCounts)
        .map(([lokasi, count]) => ({ lokasi, count }))
        .sort((a, b) => b.count - a.count);

      // Format category count
      const assetsPerCategory = Object.entries(categoryCounts)
        .map(([kategori, count]) => ({ kategori, count }));

      // Format monthly schedule count
      const maintenanceSchedules = Object.entries(monthlyMaintenanceCounts)
        .map(([month, count]) => ({ month, count }));

      const stats = {
        totalAssets,
        needsMaintenance,
        topLocation,
        maintenanceThisMonth: monthlyMaintenanceCounts["April"] || 0, // April 2026 as the active month
        assetsPerLocation,
        assetsPerCategory,
        maintenanceSchedules,
      };

      return sendResponse(h, 200, true, "Statistik aset berhasil diambil", stats);
    } catch (error) {
      console.error("Error in getAssetStats:", error);
      return sendResponse(h, 500, false, "Terjadi kesalahan server", error.message);
    }
  },

  // 3. Get Asset By ID
  getAssetById: async (request, h) => {
    try {
      const { id } = request.params;
      const asset = await Asset.findByPk(id);

      if (!asset) {
        return sendResponse(h, 404, false, "Aset tidak ditemukan");
      }

      return sendResponse(h, 200, true, "Detail aset berhasil diambil", asset);
    } catch (error) {
      console.error("Error in getAssetById:", error);
      return sendResponse(h, 500, false, "Terjadi kesalahan server", error.message);
    }
  },

  // 4. Update Asset details or toggle status
  updateAsset: async (request, h) => {
    try {
      const { id } = request.params;
      const asset = await Asset.findByPk(id);

      if (!asset) {
        return sendResponse(h, 404, false, "Aset tidak ditemukan");
      }

      const {
        kode,
        nama,
        kategori,
        lokasi,
        coa,
        merk_type,
        vendor,
        tahun_perolehan,
        harga_perolehan,
        umur_aktiva,
        periode_maintenance,
        status_maintenance,
        scheduled_months,
        schedule_details,
      } = request.payload;

      const updates = {};
      if (kode !== undefined) updates.kode = kode.trim();
      if (nama !== undefined) updates.nama = nama.trim();
      if (kategori !== undefined) updates.kategori = kategori.trim();
      if (lokasi !== undefined) updates.lokasi = lokasi.trim();
      if (coa !== undefined) updates.coa = coa ? coa.trim() : null;
      if (merk_type !== undefined) updates.merk_type = merk_type ? merk_type.trim() : null;
      if (vendor !== undefined) updates.vendor = vendor ? vendor.trim() : null;
      if (tahun_perolehan !== undefined) updates.tahun_perolehan = tahun_perolehan;
      if (harga_perolehan !== undefined) updates.harga_perolehan = harga_perolehan;
      if (umur_aktiva !== undefined) updates.umur_aktiva = umur_aktiva;
      if (periode_maintenance !== undefined) updates.periode_maintenance = periode_maintenance;
      if (status_maintenance !== undefined) updates.status_maintenance = status_maintenance;
      if (scheduled_months !== undefined) updates.scheduled_months = scheduled_months;
      if (schedule_details !== undefined) updates.schedule_details = schedule_details;

      await asset.update(updates);

      return sendResponse(h, 200, true, "Data aset berhasil diperbarui", asset);
    } catch (error) {
      console.error("Error in updateAsset:", error);
      return sendResponse(h, 500, false, "Terjadi kesalahan server", error.message);
    }
  },

  // 5. Delete Asset
  deleteAsset: async (request, h) => {
    try {
      const { id } = request.params;
      const asset = await Asset.findByPk(id);

      if (!asset) {
        return sendResponse(h, 404, false, "Aset tidak ditemukan");
      }

      await asset.destroy();

      return sendResponse(h, 200, true, "Aset berhasil dihapus", asset);
    } catch (error) {
      console.error("Error in deleteAsset:", error);
      return sendResponse(h, 500, false, "Terjadi kesalahan server", error.message);
    }
  },
};

module.exports = assetController;
