'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  Wrench,
  CheckCircle,
  Clock,
  ChevronRight,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  periode_maintenance: string | null;
  scheduled_months: string[] | string;
  schedule_details: Record<string, number[]>;
  status_maintenance: 'No Maintenance' | 'Scheduled' | 'Pending' | 'Done' | 'Overdue';
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function MaintenanceSchedule() {
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>('April'); // default to April

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

      // Fetch all assets, then we filter by month in-memory
      const response = await fetch(`${API_BASE_URL}/assets?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setAssets(data.data.assets);
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

  useEffect(() => {
    fetchAssets();
  }, []);

  const toggleMaintenanceStatus = async (asset: AssetData) => {
    let newStatus: typeof asset.status_maintenance = 'Pending';
    if (asset.status_maintenance === 'Pending') {
      newStatus = 'Done';
    } else if (asset.status_maintenance === 'Done') {
      newStatus = 'Pending';
    } else {
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

  // Helper to count schedules per month
  const getMonthCount = (monthName: string) => {
    return assets.filter(asset => {
      let months = asset.scheduled_months;
      if (typeof months === 'string') {
        try {
          months = JSON.parse(months);
        } catch {
          months = [];
        }
      }
      return Array.isArray(months) && months.includes(monthName);
    }).length;
  };

  // Get assets for selected month
  const monthAssets = assets.filter(asset => {
    let months = asset.scheduled_months;
    if (typeof months === 'string') {
      try {
        months = JSON.parse(months);
      } catch {
        months = [];
      }
    }
    return Array.isArray(months) && months.includes(selectedMonth);
  });

  const renderWeekIndicators = (asset: AssetData) => {
    let details = asset.schedule_details;
    if (typeof details === 'string') {
      try {
        details = JSON.parse(details);
      } catch {
        details = {};
      }
    }
    
    const weeks = details[selectedMonth] || [0, 0, 0, 0];
    
    return (
      <div className="flex items-center gap-1.5 justify-center">
        {weeks.map((val, idx) => (
          <div
            key={idx}
            className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold border ${
              val === 1
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-200'
                : 'bg-gray-100 border-gray-200 text-gray-400'
            }`}
            title={`Minggu ${idx + 1}: ${val === 1 ? 'Ada Jadwal' : 'Tidak Ada Jadwal'}`}
          >
            W{idx + 1}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col w-full overflow-hidden bg-gray-50/50">
      <header className="border-b bg-white shadow-sm flex-shrink-0">
        <div className="flex min-h-[4rem] items-center px-6 justify-between">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              AOPS Maintenance Schedule
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAssets} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Reload Schedule
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* MONTHS GRID SELECTOR */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Pilih Bulan Perawatan
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {MONTHS.map(month => {
                const count = loading ? 0 : getMonthCount(month);
                const isSelected = selectedMonth === month;
                const hasSchedules = count > 0;
                
                return (
                  <Card
                    key={month}
                    onClick={() => !loading && setSelectedMonth(month)}
                    className={`cursor-pointer transition-all duration-300 transform hover:-translate-y-0.5 shadow-sm border ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                      <span className={`text-sm font-bold ${isSelected ? 'text-blue-700' : 'text-gray-700'}`}>
                        {month}
                      </span>
                      <div className="mt-2 flex items-center gap-1.5">
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                          <Badge
                            className={`text-[10px] font-bold ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : hasSchedules
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-100 text-slate-400 border-none'
                            }`}
                          >
                            {count} Maintenance
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* DETAIL VIEW FOR SELECTED MONTH */}
          <Card className="shadow-sm border border-gray-100">
            <CardHeader className="border-b border-gray-100 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-gray-800">
                    Jadwal Perawatan Bulan: {selectedMonth}
                  </CardTitle>
                  <CardDescription>
                    Daftar aset yang dijadwalkan menerima tindakan preventif atau rutin pada bulan ini.
                  </CardDescription>
                </div>
                <Badge className="bg-blue-100 hover:bg-blue-100 text-blue-800 border-blue-200 text-sm py-1 px-3 w-fit">
                  {loading ? 'Counting...' : `${monthAssets.length} Aset Terjadwal`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                      <th className="p-4">Kode</th>
                      <th className="p-4">Nama Aset</th>
                      <th className="p-4">Kategori</th>
                      <th className="p-4">Lokasi</th>
                      <th className="p-4 text-center">Rincian Minggu</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                          <span className="text-gray-400 text-sm">Loading schedule...</span>
                        </td>
                      </tr>
                    ) : monthAssets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-gray-500 font-medium">
                          Tidak ada maintenance terjadwal di bulan {selectedMonth}.
                        </td>
                      </tr>
                    ) : (
                      monthAssets.map((asset) => (
                        <tr key={asset.id} className="text-sm text-gray-700 hover:bg-gray-50/30">
                          <td className="p-4 font-semibold text-gray-900">{asset.kode}</td>
                          <td className="p-4">
                            <div className="font-semibold text-gray-900">{asset.nama}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              Periode: {asset.periode_maintenance || 'N/A'}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="secondary" className="bg-slate-100 text-slate-800 border-none font-medium">
                              {asset.kategori}
                            </Badge>
                          </td>
                          <td className="p-4 font-medium">{asset.lokasi}</td>
                          <td className="p-4">{renderWeekIndicators(asset)}</td>
                          <td className="p-4 text-center">
                            {asset.status_maintenance === 'Pending' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleMaintenanceStatus(asset)}
                                className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 font-semibold text-xs flex items-center gap-1 mx-auto"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                Tandai Selesai
                              </Button>
                            ) : asset.status_maintenance === 'Done' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleMaintenanceStatus(asset)}
                                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 font-semibold text-xs flex items-center gap-1 mx-auto"
                              >
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                Selesai (Reset)
                              </Button>
                            ) : (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 font-medium">
                                Terjadwal
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
