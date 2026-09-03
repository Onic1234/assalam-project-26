'use client';

import React, { useEffect, useState } from 'react';
import {
  Utensils,
  Plus,
  Search,
  Edit2,
  Trash2,
  TrendingUp,
  AlertTriangle,
  Package,
  RefreshCw,
  X,
  Check,
  History,
  FileText,
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

interface Ingredient {
  id: number;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  costPerUnit: number;
  createdAt?: string;
  updatedAt?: string;
}

interface IngredientLog {
  id: number;
  ingredientId: number;
  productId?: number;
  type: 'USAGE_SALE' | 'RESTOCK' | 'ADJUSTMENT';
  quantity: number;
  costTotal: number;
  notes?: string;
  createdAt: string;
  ingredient?: {
    name: string;
    unit: string;
    costPerUnit: number;
  };
  product?: {
    name: string;
    price: number;
  };
}

export default function IngredientsPage() {
  const [activeTab, setActiveTab] = useState<'stock' | 'logs'>('stock');

  // Data States
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [logs, setLogs] = useState<IngredientLog[]>([]);
  const [totalLogExpense, setTotalLogExpense] = useState(0);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);

  // Form States
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    unit: 'ml',
    stock: '0',
    minStock: '100',
    costPerUnit: '0',
  });
  const [restockQty, setRestockQty] = useState('');

  // Package Calculator State
  const [packagePrice, setPackagePrice] = useState('');
  const [packageSize, setPackageSize] = useState('');

  const handleCalcCostPerUnit = (priceStr: string, sizeStr: string) => {
    setPackagePrice(priceStr);
    setPackageSize(sizeStr);
    const p = parseFloat(priceStr) || 0;
    const s = parseFloat(sizeStr) || 0;
    if (p > 0 && s > 0) {
      const calcCost = (p / s).toFixed(2);
      setFormData((prev) => ({ ...prev, costPerUnit: calcCost }));
    }
  };

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Fetch Ingredients
  const fetchIngredients = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/ingredients`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIngredients(data.data || []);
      } else {
        setErrorMsg(data.message || 'Gagal mengambil data bahan baku');
      }
    } catch (err: any) {
      console.error('Fetch ingredients error:', err);
      setErrorMsg('Gagal terhubung ke server');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Ingredient Logs
  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/ingredients/logs`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLogs(data.data.logs || []);
        setTotalLogExpense(data.data.totalExpense || 0);
      }
    } catch (err) {
      console.error('Fetch logs error:', err);
    }
  };

  useEffect(() => {
    fetchIngredients();
    fetchLogs();
  }, []);

  const handleOpenAddModal = () => {
    setFormData({
      name: '',
      unit: 'ml',
      stock: '0',
      minStock: '100',
      costPerUnit: '0',
    });
    setPackagePrice('');
    setPackageSize('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (ing: Ingredient) => {
    setSelectedIngredient(ing);
    setFormData({
      name: ing.name,
      unit: ing.unit,
      stock: ing.stock.toString(),
      minStock: ing.minStock.toString(),
      costPerUnit: ing.costPerUnit.toString(),
    });
    setPackagePrice('');
    setPackageSize('');
    setIsEditModalOpen(true);
  };

  const handleOpenRestockModal = (ing: Ingredient) => {
    setSelectedIngredient(ing);
    setRestockQty('');
    setIsRestockModalOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/ingredients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Bahan baku berhasil ditambahkan');
        setIsAddModalOpen(false);
        fetchIngredients();
        fetchLogs();
      } else {
        setErrorMsg(data.message || 'Gagal membuat bahan baku');
      }
    } catch (err) {
      setErrorMsg('Gagal memproses penambahan bahan baku');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient) return;

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/ingredients/${selectedIngredient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Bahan baku berhasil diperbarui');
        setIsEditModalOpen(false);
        fetchIngredients();
      } else {
        setErrorMsg(data.message || 'Gagal mengubah bahan baku');
      }
    } catch (err) {
      setErrorMsg('Gagal memproses pengubahan bahan baku');
    }
  };

  const handleSaveRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient || !restockQty) return;

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(
        `${API_BASE_URL}/ingredients/${selectedIngredient.id}/restock`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({ addQuantity: restockQty }),
        }
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(`Stok ${selectedIngredient.name} berhasil ditambah`);
        setIsRestockModalOpen(false);
        fetchIngredients();
        fetchLogs();
      } else {
        setErrorMsg(data.message || 'Gagal menambah stok');
      }
    } catch (err) {
      setErrorMsg('Gagal memproses restock');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus bahan baku "${name}"?`)) return;

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/ingredients/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Bahan baku berhasil dihapus');
        fetchIngredients();
      } else {
        setErrorMsg(data.message || 'Gagal menghapus bahan baku');
      }
    } catch (err) {
      setErrorMsg('Gagal memproses penghapusan');
    }
  };

  // Filtered
  const filteredIngredients = ingredients.filter((ing) =>
    ing.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLogs = logs.filter(
    (l) =>
      (l.ingredient?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.product?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.notes || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalBahan = ingredients.length;
  const stokTipisCount = ingredients.filter((ing) => ing.stock > 0 && ing.stock <= ing.minStock).length;
  const stokHabisCount = ingredients.filter((ing) => ing.stock <= 0).length;
  const totalNilaiInventaris = ingredients.reduce(
    (acc, ing) => acc + ing.stock * ing.costPerUnit,
    0
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="flex items-center gap-2">
                <Utensils className="h-6 w-6 text-red-600" />
                <h1 className="text-xl font-bold text-gray-800">Gudang & Monitoring Bahan Baku</h1>
              </div>
            </div>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Tambah Bahan Baku
            </button>
          </header>

          <main className="flex-1 p-6 space-y-6">
            {/* Notification Messages */}
            {successMsg && (
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
                <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {errorMsg && (
              <div className="flex items-center justify-between rounded-lg bg-rose-50 border border-rose-200 p-4 text-rose-800 text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
                <button onClick={() => setErrorMsg('')} className="text-rose-600 hover:text-rose-800">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 gap-4 text-sm font-medium text-gray-600">
              <button
                onClick={() => setActiveTab('stock')}
                className={`flex items-center gap-2 pb-3 pt-1 border-b-2 transition-colors ${
                  activeTab === 'stock'
                    ? 'border-red-600 text-red-600 font-bold'
                    : 'border-transparent hover:text-gray-900'
                }`}
              >
                <Package className="h-4 w-4" />
                Daftar Stok Bahan Baku ({totalBahan})
              </button>
              <button
                onClick={() => {
                  setActiveTab('logs');
                  fetchLogs();
                }}
                className={`flex items-center gap-2 pb-3 pt-1 border-b-2 transition-colors ${
                  activeTab === 'logs'
                    ? 'border-red-600 text-red-600 font-bold'
                    : 'border-transparent hover:text-gray-900'
                }`}
              >
                <History className="h-4 w-4" />
                Monitoring & Audit Penggunaan ({logs.length})
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Nilai Inventaris Stok</span>
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold text-emerald-700">
                  Rp {totalNilaiInventaris.toLocaleString('id-ID')}
                </div>
                <p className="text-xs text-gray-500 mt-1">Estimasi total harga beli stok gudang</p>
              </div>

              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Modal Terpakai (Penjualan)</span>
                  <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold text-purple-700">
                  Rp {totalLogExpense.toLocaleString('id-ID')}
                </div>
                <p className="text-xs text-gray-500 mt-1">Total HPP bahan baku yang sudah keluar</p>
              </div>

              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Stok Tipis (Warning)</span>
                  <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold text-amber-600">{stokTipisCount}</div>
                <p className="text-xs text-gray-500 mt-1">Perlu segera di-restock</p>
              </div>

              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-500">Stok Habis (Kosong)</span>
                  <div className="rounded-lg bg-red-50 p-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold text-red-600">{stokHabisCount}</div>
                <p className="text-xs text-gray-500 mt-1">Sajian menu terhambat</p>
              </div>
            </div>

            {/* TAB CONTENT 1: DAFTAR STOK BAHAN BAKU */}
            {activeTab === 'stock' && (
              <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <div className="flex flex-col gap-4 border-b bg-gray-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Cari nama bahan baku..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <button
                    onClick={fetchIngredients}
                    className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <RefreshCw className="h-4 w-4 text-gray-500" />
                    Refresh
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-100/70 text-xs uppercase font-semibold text-gray-700">
                      <tr>
                        <th className="px-6 py-3.5">Nama Bahan Baku</th>
                        <th className="px-6 py-3.5">Satuan</th>
                        <th className="px-6 py-3.5">Stok Terkini</th>
                        <th className="px-6 py-3.5">Batas Minimal</th>
                        <th className="px-6 py-3.5">HPP Beli / Unit</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {loading ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                            Memuat data bahan baku...
                          </td>
                        </tr>
                      ) : filteredIngredients.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                            Belum ada bahan baku terdaftar. Silakan klik "Tambah Bahan Baku".
                          </td>
                        </tr>
                      ) : (
                        filteredIngredients.map((ing) => {
                          const isHabis = ing.stock <= 0;
                          const isTipis = ing.stock > 0 && ing.stock <= ing.minStock;
                          return (
                            <tr key={ing.id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="px-6 py-4 font-semibold text-gray-900">{ing.name}</td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                                  {ing.unit}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-bold text-gray-900">
                                {ing.stock.toLocaleString('id-ID')} {ing.unit}
                              </td>
                              <td className="px-6 py-4 text-gray-500">
                                {ing.minStock.toLocaleString('id-ID')} {ing.unit}
                              </td>
                              <td className="px-6 py-4 font-medium text-gray-800">
                                Rp {ing.costPerUnit.toLocaleString('id-ID')} / {ing.unit}
                              </td>
                              <td className="px-6 py-4">
                                {isHabis ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                                    ● Habis
                                  </span>
                                ) : isTipis ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                                    ⚠️ Stok Tipis
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                                    ✓ Aman
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleOpenRestockModal(ing)}
                                    className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                    title="Restok Tambah Bahan"
                                  >
                                    + Restok
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditModal(ing)}
                                    className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-blue-600"
                                    title="Edit Bahan"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(ing.id, ing.name)}
                                    className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-red-600"
                                    title="Hapus Bahan"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: MONITORING & AUDIT PENGGUNAAN BAHAN */}
            {activeTab === 'logs' && (
              <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <div className="flex flex-col gap-4 border-b bg-gray-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Cari bahan, produk, atau transaksi..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>
                  <button
                    onClick={fetchLogs}
                    className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <RefreshCw className="h-4 w-4 text-gray-500" />
                    Refresh Logs
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-100/70 text-xs uppercase font-semibold text-gray-700">
                      <tr>
                        <th className="px-6 py-3.5">Waktu & Tanggal</th>
                        <th className="px-6 py-3.5">Bahan Baku</th>
                        <th className="px-6 py-3.5">Tipe Aktivitas</th>
                        <th className="px-6 py-3.5">Jumlah Terpakai / Masuk</th>
                        <th className="px-6 py-3.5">Digunakan Untuk Produk</th>
                        <th className="px-6 py-3.5">Nilai Modal (HPP)</th>
                        <th className="px-6 py-3.5">Catatan / Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                            Belum ada catatan riwayat penggunaan bahan baku.
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((log) => {
                          const dateStr = new Date(log.createdAt).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          });
                          const isSale = log.type === 'USAGE_SALE';
                          return (
                            <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                              <td className="px-6 py-4 text-xs font-medium text-gray-500">{dateStr}</td>
                              <td className="px-6 py-4 font-bold text-gray-900">
                                {log.ingredient?.name || `Bahan #${log.ingredientId}`}
                              </td>
                              <td className="px-6 py-4">
                                {isSale ? (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800">
                                    <ArrowUpRight className="h-3 w-3" /> Terpakai POS
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                                    <ArrowDownLeft className="h-3 w-3" /> Restok Masuk
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 font-bold">
                                <span className={isSale ? 'text-rose-600' : 'text-emerald-600'}>
                                  {isSale ? '-' : '+'}{log.quantity} {log.ingredient?.unit}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-medium text-gray-900">
                                {log.product?.name ? (
                                  <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs text-amber-900 font-semibold border border-amber-200">
                                    🍲 {log.product.name}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 font-semibold text-gray-800">
                                Rp {(log.costTotal || 0).toLocaleString('id-ID')}
                              </td>
                              <td className="px-6 py-4 text-xs text-gray-500">{log.notes || '-'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Modal Add / Edit */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">
                {isAddModalOpen ? 'Tambah Bahan Baku Baru' : `Edit Bahan Baku: ${selectedIngredient?.name}`}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={isAddModalOpen ? handleSaveAdd : handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">Nama Bahan Baku</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Susu UHT, Kopi Arabika, Gula Aren, Cup 16oz"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Satuan Ukuran Porsi</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="ml">milliLiter (ml) - Minuman</option>
                    <option value="gram">gram (g) - Kopi/Bubuk/Tepung</option>
                    <option value="pcs">pieces (pcs) - Cup/Sedotan/Kemasan</option>
                    <option value="liter">Liter (l) - Sirup/Cairan Besar</option>
                    <option value="kg">KiloGram (kg) - Bahan Berat</option>
                    <option value="bungkus">Bungkus</option>
                    <option value="botol">Botol</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">HPP Beli / {formData.unit} (Rp)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder={`Harga per 1 ${formData.unit}`}
                    value={formData.costPerUnit}
                    onChange={(e) => setFormData({ ...formData, costPerUnit: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 bg-gray-50"
                  />
                </div>
              </div>

              {/* 🧮 KALKULATOR BELI KEMASAN / KULAKAN */}
              <div className="rounded-lg bg-amber-50/80 border border-amber-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900">🧮 Kalkulator Beli Kemasan / Dus</span>
                  <span className="text-[10px] text-amber-700">Hitung otomatis Rp / {formData.unit}</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-tight">
                  Jika Anda beli per dus/botol/liter (misal Susu 1 Liter = 1000ml harga Rp 20.000, atau Kopi 1kg = 1000g harga Rp 150.000), masukkan di bawah ini:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700">Harga Beli Kemasan (Rp)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Misal: 20000"
                      value={packagePrice}
                      onChange={(e) => handleCalcCostPerUnit(e.target.value, packageSize)}
                      className="mt-0.5 w-full rounded border border-gray-300 px-2.5 py-1 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700">Isi per Kemasan ({formData.unit})</label>
                    <input
                      type="number"
                      min="0.1"
                      placeholder="Misal: 1000"
                      value={packageSize}
                      onChange={(e) => handleCalcCostPerUnit(packagePrice, e.target.value)}
                      className="mt-0.5 w-full rounded border border-gray-300 px-2.5 py-1 text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
                {packagePrice && packageSize && parseFloat(packageSize) > 0 && (
                  <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200 flex justify-between items-center">
                    <span>Hasil Otomatis:</span>
                    <strong className="text-xs text-emerald-700">
                      Rp {parseFloat(packagePrice).toLocaleString('id-ID')} / {packageSize} {formData.unit} = <span className="underline font-bold text-emerald-900">Rp {(parseFloat(packagePrice) / parseFloat(packageSize)).toFixed(2)} per {formData.unit}</span>
                    </strong>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Stok Awal ({formData.unit})</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase">Batas Stok Minimal ({formData.unit})</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Restok Cepat */}
      {isRestockModalOpen && selectedIngredient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Restok: {selectedIngredient.name}</h3>
              <button onClick={() => setIsRestockModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRestock} className="mt-4 space-y-4">
              <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
                <div>Stok Saat Ini: <strong className="text-gray-900">{selectedIngredient.stock} {selectedIngredient.unit}</strong></div>
                <div>Satuan: <strong className="text-gray-900">{selectedIngredient.unit}</strong></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase">Jumlah Tambahan Stok</label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    required
                    placeholder={`Jumlah dalam ${selectedIngredient.unit}`}
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <span className="text-sm font-semibold text-gray-600">{selectedIngredient.unit}</span>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsRestockModalOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  + Tambahkan Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SidebarProvider>
  );
}
