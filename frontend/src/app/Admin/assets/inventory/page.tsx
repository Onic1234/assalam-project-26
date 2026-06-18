'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  RefreshCw,
  Filter,
  Wrench,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface AssetData {
  id: number;
  kode: string;
  nama: string;
  kategori: string;
  lokasi: string;
  coa: string | null;
  merk_type: string | null;
  vendor: string | null;
  tahun_perolehan: number | null;
  harga_perolehan: number | null;
  umur_aktiva: number | null;
  periode_maintenance: string | null;
  scheduled_months: string[] | string;
  status_maintenance: 'No Maintenance' | 'Scheduled' | 'Pending' | 'Done' | 'Overdue';
  status: 'Aktif' | 'Pasif' | 'Non Aktif';
}

const CATEGORIES = ['Utility', 'Furniture', 'Mekanikal', 'Elektronik', 'Mesin'];

const LOCATIONS = [
  'Café',
  'Kantor',
  'Ruang Chemical',
  'Stadium',
  'Ruang Pompa',
  'Lobby Entrance',
  'Locker Room',
  'Ruang Lantai 2',
  'Workout Space',
  'Toilet',
  'Ruang Kajian',
  'Pool Area'
];

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const YEARS = ['2024', '2025', '2026'];

function AssetInventoryContent() {
  const searchParams = useSearchParams();
  const initialLokasi = searchParams.get('lokasi') || 'all';
  const initialKategori = searchParams.get('kategori') || 'all';

  const [assets, setAssets] = useState<AssetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(10);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialKategori);
  const [selectedLocation, setSelectedLocation] = useState<string>(initialLokasi);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Update selection if searchParams change
  useEffect(() => {
    if (searchParams.get('lokasi')) {
      setSelectedLocation(searchParams.get('lokasi') || 'all');
    }
    if (searchParams.get('kategori')) {
      setSelectedCategory(searchParams.get('kategori') || 'all');
    }
  }, [searchParams]);


  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('authToken');
    if (!token) {
      setError('Authentication token not found. Please log in again.');
      window.location.href = '/login';
      return null;
    }
    return token;
  };

  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      if (!token) return;

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });

      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory !== 'all') params.append('kategori', selectedCategory);
      if (selectedLocation !== 'all') params.append('lokasi', selectedLocation);
      if (selectedYear !== 'all') params.append('tahun_perolehan', selectedYear);
      if (selectedMonth !== 'all') params.append('bulan_maintenance', selectedMonth);
      if (selectedStatus !== 'all') params.append('status', selectedStatus);

      const response = await fetch(`${API_BASE_URL}/assets?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setAssets(data.data.assets);
        setTotalPages(data.data.totalPages);
        setTotalItems(data.data.totalItems);
      } else {
        throw new Error(data.message || 'Failed to fetch assets');
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when parameters change
  useEffect(() => {
    fetchAssets();
  }, [currentPage, selectedCategory, selectedLocation, selectedYear, selectedMonth, selectedStatus]);

  // Debounced search trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      setCurrentPage(1);
      fetchAssets();
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Handle Asset Status Cycle (Aktif -> Pasif -> Non Aktif -> Aktif)
  const toggleAssetStatus = async (asset: AssetData) => {
    let nextStatus: AssetData['status'] = 'Aktif';
    if (asset.status === 'Aktif') {
      nextStatus = 'Pasif';
    } else if (asset.status === 'Pasif') {
      nextStatus = 'Non Aktif';
    } else if (asset.status === 'Non Aktif') {
      nextStatus = 'Aktif';
    } else {
      nextStatus = 'Pasif';
    }

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/assets/${asset.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update asset status');
      }

      const data = await response.json();
      if (data.success) {
        toast.success(`Status aset "${asset.nama}" diubah menjadi ${nextStatus}`);
        
        // Optimistic UI update
        setAssets(prev =>
          prev.map(a => (a.id === asset.id ? { ...a, status: nextStatus } : a))
        );
      } else {
        throw new Error(data.message || 'Failed to update asset status');
      }
    } catch (error) {
      console.error('Error updating asset status:', error);
      toast.error('Gagal memperbarui status aset');
    }
  };

  // Handle Maintenance Status Toggle
  const toggleMaintenanceStatus = async (asset: AssetData) => {
    let newStatus: typeof asset.status_maintenance = 'Pending';
    if (asset.status_maintenance === 'Pending') {
      newStatus = 'Done';
    } else if (asset.status_maintenance === 'Done') {
      newStatus = 'Pending';
    } else {
      // If it doesn't have scheduled maintenance or is just scheduled, do nothing
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/assets/${asset.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status_maintenance: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const data = await response.json();
      if (data.success) {
        toast.success(`Status aset "${asset.nama}" diubah menjadi ${newStatus}`);
        
        // Optimistic UI update
        setAssets(prev =>
          prev.map(a => (a.id === asset.id ? { ...a, status_maintenance: newStatus } : a))
        );
      } else {
        throw new Error(data.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Gagal memperbarui status maintenance');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedLocation('all');
    setSelectedYear('all');
    setSelectedMonth('all');
    setSelectedStatus('all');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery ||
    selectedCategory !== 'all' ||
    selectedLocation !== 'all' ||
    selectedYear !== 'all' ||
    selectedMonth !== 'all' ||
    selectedStatus !== 'all';

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const renderAssetStatusBadge = (status: AssetData['status'], asset: AssetData) => {
    let badgeClass = 'cursor-pointer hover:opacity-80 transition-opacity';
    let label = status || 'Aktif';

    if (status === 'Aktif') {
      badgeClass += ' bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
    } else if (status === 'Pasif') {
      badgeClass += ' bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100';
    } else if (status === 'Non Aktif') {
      badgeClass += ' bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100';
    } else {
      badgeClass += ' bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
      label = 'Aktif';
    }

    return (
      <Badge
        variant="outline"
        className={`px-3 py-1 text-xs font-semibold rounded-full select-none ${badgeClass}`}
        onClick={() => toggleAssetStatus(asset)}
      >
        {label}
      </Badge>
    );
  };

  const renderStatusBadge = (status: AssetData['status_maintenance'], asset: AssetData) => {
    const isInteractive = status === 'Pending' || status === 'Done';
    let badgeClass = 'cursor-default';
    let label: string = status;

    if (status === 'Pending') {
      badgeClass = 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200 cursor-pointer';
      label = 'Pending (Klik selesai)';
    } else if (status === 'Done') {
      badgeClass = 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200 cursor-pointer';
      label = 'Selesai (Klik reset)';
    } else if (status === 'Scheduled') {
      badgeClass = 'bg-blue-100 text-blue-800 border-blue-200';
      label = 'Terjadwal';
    } else if (status === 'No Maintenance') {
      badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
      label = 'Tanpa Perawatan';
    } else if (status === 'Overdue') {
      badgeClass = 'bg-red-100 text-red-800 border-red-200';
      label = 'Terlambat';
    }

    return (
      <Badge
        variant="outline"
        className={`px-3 py-1 text-xs font-semibold rounded-full select-none transition-all duration-200 ${badgeClass}`}
        onClick={() => isInteractive && toggleMaintenanceStatus(asset)}
      >
        {status === 'Pending' && <Wrench className="w-3.5 h-3.5 mr-1 text-amber-600 animate-pulse" />}
        {status === 'Done' && <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />}
        {status === 'No Maintenance' && <XCircle className="w-3.5 h-3.5 mr-1 text-slate-400" />}
        {label}
      </Badge>
    );
  };

  return (
    <div className="flex-1 flex flex-col w-full overflow-hidden bg-gray-50/50">
      <header className="border-b bg-white shadow-sm flex-shrink-0">
        <div className="flex min-h-[4rem] items-center px-6 justify-between">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              AOPS Asset Inventory
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchAssets} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Reload Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                sessionStorage.removeItem('asset_authenticated');
                window.location.reload();
              }}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              <LogOut className="h-4 w-4" />
              Logout Asset
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* FILTERS PANEL */}
          <Card className="shadow-sm border border-gray-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-500" />
                Filter & Cari Aset
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                {/* Search Bar */}
                <div className="relative col-span-1 md:col-span-2 lg:col-span-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Cari nama, kode, vendor..."
                    className="pl-9 bg-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {/* Category Filter */}
                <div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kategori</SelectItem>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location Filter */}
                <div>
                  <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Lokasi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Lokasi</SelectItem>
                      {LOCATIONS.map(loc => (
                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Year Filter */}
                <div>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Tahun Perolehan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Tahun</SelectItem>
                      {YEARS.map(yr => (
                        <SelectItem key={yr} value={yr}>{yr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Maintenance Month Filter */}
                <div>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Bulan Maintenance" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Bulan</SelectItem>
                      {MONTHS.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Status Aset" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="Aktif">Aktif</SelectItem>
                      <SelectItem value="Pasif">Pasif (Rusak/Tidak Digunakan)</SelectItem>
                      <SelectItem value="Non Aktif">Non Aktif (Dihapus)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-500">
                      Filter Aktif:
                    </span>
                    {searchQuery && (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-100">
                        Cari: {searchQuery}
                      </Badge>
                    )}
                    {selectedCategory !== 'all' && (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-100">
                        Kategori: {selectedCategory}
                      </Badge>
                    )}
                    {selectedLocation !== 'all' && (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-100">
                        Lokasi: {selectedLocation}
                      </Badge>
                    )}
                    {selectedYear !== 'all' && (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-100">
                        Tahun: {selectedYear}
                      </Badge>
                    )}
                    {selectedMonth !== 'all' && (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-100">
                        Bulan Maint: {selectedMonth}
                      </Badge>
                    )}
                    {selectedStatus !== 'all' && (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-100">
                        Status: {selectedStatus}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-xs h-6 px-2 hover:bg-gray-100 text-gray-500 font-semibold"
                    >
                      Hapus Semua Filter
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* MAIN TABLE */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-500 font-medium">
                Menampilkan <span className="font-bold text-gray-900">{assets.length}</span> dari{' '}
                <span className="font-bold text-gray-900">{totalItems}</span> total aset
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <th className="p-4 font-bold">Kode</th>
                    <th className="p-4 font-bold">Nama Aset</th>
                    <th className="p-4 font-bold">Kategori</th>
                    <th className="p-4 font-bold">Lokasi</th>
                    <th className="p-4 font-bold">Vendor</th>
                    <th className="p-4 font-bold text-center">Tahun</th>
                    <th className="p-4">Periode Maintenance</th>
                    <th className="p-4 text-center">Status Aset</th>
                    <th className="p-4 text-center">Status Maintenance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                          <span className="text-gray-400 text-sm font-medium">Loading inventory data...</span>
                        </div>
                      </td>
                    </tr>
                  ) : assets.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-12 text-center text-gray-500 font-medium">
                        Tidak ada aset yang cocok dengan kriteria filter.
                      </td>
                    </tr>
                  ) : (
                    assets.map((asset) => (
                      <tr key={asset.id} className="text-sm text-gray-700 hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 font-semibold text-gray-900 whitespace-nowrap">{asset.kode}</td>
                        <td className="p-4">
                          <div className="font-semibold text-gray-900">{asset.nama}</div>
                          {asset.merk_type && (
                            <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[240px]">
                              {asset.merk_type}
                            </div>
                          )}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-800 border-none font-medium">
                            {asset.kategori}
                          </Badge>
                        </td>
                        <td className="p-4 font-medium whitespace-nowrap">{asset.lokasi}</td>
                        <td className="p-4 text-xs text-gray-500 max-w-[150px] truncate">{asset.vendor || '-'}</td>
                        <td className="p-4 text-center whitespace-nowrap">{asset.tahun_perolehan || '-'}</td>
                        <td className="p-4 text-xs font-medium text-slate-600 whitespace-nowrap">{asset.periode_maintenance || 'N/A'}</td>
                        <td className="p-4 text-center whitespace-nowrap">
                          {renderAssetStatusBadge(asset.status, asset)}
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          {renderStatusBadge(asset.status_maintenance, asset)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION PANEL */}
            {totalPages > 1 && (
              <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="flex items-center"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Sebelumnya
                </Button>
                <div className="text-sm font-semibold text-gray-700">
                  Halaman {currentPage} dari {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="flex items-center"
                >
                  Selanjutnya
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function AssetInventory() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500 font-medium">Loading inventory content...</p>
      </div>
    }>
      <AssetInventoryContent />
    </Suspense>
  );
}

