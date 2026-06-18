'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  CheckCircle,
  Clock,
  Package,
  MapPin,
  RefreshCw,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SidebarTrigger } from '@/components/ui/sidebar';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface AssetData {
  id: number;
  kode: string;
  nama: string;
  kategori: string;
  lokasi: string;
  vendor: string | null;
  tahun_perolehan: number | null;
  periode_maintenance: string | null;
  scheduled_months: string[] | string;
  status_maintenance: 'No Maintenance' | 'Scheduled' | 'Pending' | 'Done' | 'Overdue';
}

export default function AssetReport() {
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Calculate statistics
  const totalAssets = assets.length;
  const maintenanceAssets = assets.filter(a => a.status_maintenance === 'Pending' || a.status_maintenance === 'Done');
  const pendingMaint = assets.filter(a => a.status_maintenance === 'Pending').length;
  const doneMaint = assets.filter(a => a.status_maintenance === 'Done').length;
  
  const completionRate = maintenanceAssets.length > 0 
    ? Math.round((doneMaint / maintenanceAssets.length) * 100) 
    : 100;

  // Category summary
  const categorySummary = assets.reduce((acc, curr) => {
    const cat = curr.kategori || 'Tanpa Kategori';
    if (!acc[cat]) {
      acc[cat] = { count: 0, pending: 0, done: 0 };
    }
    acc[cat].count++;
    if (curr.status_maintenance === 'Pending') acc[cat].pending++;
    if (curr.status_maintenance === 'Done') acc[cat].done++;
    return acc;
  }, {} as Record<string, { count: number; pending: number; done: number }>);

  // Export entire asset list to CSV
  const exportToCSV = () => {
    if (assets.length === 0) return;
    
    const headers = ['Kode', 'Nama Aset', 'Kategori', 'Lokasi', 'Vendor', 'Tahun Perolehan', 'Periode Maintenance', 'Status Maintenance'];
    const rows = assets.map(a => [
      a.kode,
      `"${a.nama.replace(/"/g, '""')}"`,
      a.kategori,
      a.lokasi,
      `"${(a.vendor || '').replace(/"/g, '""')}"`,
      a.tahun_perolehan || '',
      a.periode_maintenance || '',
      a.status_maintenance
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AOPS_Asset_Inventory_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export maintenance schedules summary to CSV
  const exportMaintenanceCSV = () => {
    if (assets.length === 0) return;

    const headers = ['Kode', 'Nama Aset', 'Kategori', 'Lokasi', 'Periode Maintenance', 'Jadwal Bulan'];
    const rows = assets
      .filter(a => {
        let months = a.scheduled_months;
        if (typeof months === 'string') {
          try { months = JSON.parse(months); } catch { months = []; }
        }
        return Array.isArray(months) && months.length > 0;
      })
      .map(a => {
        let months = a.scheduled_months;
        if (typeof months === 'string') {
          try { months = JSON.parse(months); } catch { months = []; }
        }
        const monthsStr = Array.isArray(months) ? months.join(' | ') : '';
        return [
          a.kode,
          `"${a.nama.replace(/"/g, '""')}"`,
          a.kategori,
          a.lokasi,
          a.periode_maintenance || '',
          `"${monthsStr}"`
        ];
      });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AOPS_Maintenance_Schedule_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col w-full overflow-hidden bg-gray-50/50">
      <header className="border-b bg-white shadow-sm flex-shrink-0 print:hidden">
        <div className="flex min-h-[4rem] items-center px-6 justify-between">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              AOPS Asset Report
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAssets} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Reload Report
          </Button>
        </div>
      </header>

      {/* PRINT-ONLY HEADER */}
      <div className="hidden print:block p-8 border-b text-center">
        <h1 className="text-2xl font-bold">LAPORAN ASET & INVENTARIS AOPS</h1>
        <p className="text-gray-500 mt-1">Assalaam Olympic Pool Stadium (AOPS)</p>
        <p className="text-xs text-gray-400 mt-0.5">Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}</p>
      </div>

      <main className="flex-1 overflow-auto p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {error && (
            <Alert variant="destructive" className="print:hidden">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* KPI STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-sm border border-gray-100 bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold uppercase text-slate-400">
                  Total Aset Terdaftar
                </CardTitle>
                <Package className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight text-slate-800">
                  {loading ? '...' : totalAssets}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  100% terklasifikasi dalam kategori utama
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-gray-150 bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold uppercase text-slate-400">
                  Perawatan Selesai
                </CardTitle>
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight text-slate-800">
                  {loading ? '...' : `${doneMaint} / ${maintenanceAssets.length}`}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Aset terjadwal di bulan April yang sudah selesai dirawat
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-gray-100 bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold uppercase text-slate-400">
                  Rasio Kepatuhan Perawatan
                </CardTitle>
                <Clock className="h-5 w-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight text-slate-800">
                  {loading ? '...' : `${completionRate}%`}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Target penyelesaian tugas bulan ini
                </p>
              </CardContent>
            </Card>
          </div>

          {/* EXPORTS CARD */}
          <Card className="shadow-sm border border-gray-100 bg-white print:hidden">
            <CardHeader>
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Ekspor & Cetak Dokumen
              </CardTitle>
              <CardDescription>
                Unduh file data mentah dalam format CSV atau cetak ringkasan laporan untuk kebutuhan arsip.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4 pt-1">
              <Button onClick={exportToCSV} disabled={loading || assets.length === 0} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                <Download className="w-4 h-4" />
                Ekspor Data Aset (CSV)
              </Button>
              <Button onClick={exportMaintenanceCSV} disabled={loading || assets.length === 0} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700">
                <Download className="w-4 h-4" />
                Ekspor Jadwal Perawatan (CSV)
              </Button>
              <Button onClick={handlePrint} disabled={loading || assets.length === 0} variant="outline" className="flex items-center gap-2 border-gray-300">
                <Printer className="w-4 h-4" />
                Cetak Laporan Resmi
              </Button>
            </CardContent>
          </Card>

          {/* TABLES GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category summary table */}
            <Card className="shadow-sm border border-gray-100 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-gray-800">
                  Ringkasan Nilai Kategori Aset
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 font-semibold text-gray-500 uppercase border-b border-gray-100 text-xs">
                      <th className="p-4">Kategori</th>
                      <th className="p-4 text-center">Jumlah Aset</th>
                      <th className="p-4 text-center">Maint Selesai</th>
                      <th className="p-4 text-center">Maint Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-gray-400">Loading...</td>
                      </tr>
                    ) : (
                      Object.entries(categorySummary).map(([cat, info]) => (
                        <tr key={cat} className="hover:bg-gray-50/50">
                          <td className="p-4 font-bold text-slate-800">{cat}</td>
                          <td className="p-4 text-center font-semibold text-slate-700">{info.count}</td>
                          <td className="p-4 text-center">
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold">
                              {info.done}
                            </Badge>
                          </td>
                          <td className="p-4 text-center">
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 font-bold">
                              {info.pending}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Location summary table */}
            <Card className="shadow-sm border border-gray-100 bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-gray-800">
                  Penyebaran Lokasi Utama
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 font-semibold text-gray-500 uppercase border-b border-gray-100 text-xs">
                      <th className="p-4">Lokasi</th>
                      <th className="p-4 text-center">Jumlah Aset</th>
                      <th className="p-4 text-center">Proporsi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-gray-400">Loading...</td>
                      </tr>
                    ) : (
                      assets.reduce((acc, curr) => {
                        const loc = curr.lokasi || 'Unknown';
                        const existing = acc.find(item => item.lokasi === loc);
                        if (existing) {
                          existing.count++;
                        } else {
                          acc.push({ lokasi: loc, count: 1 });
                        }
                        return acc;
                      }, [] as { lokasi: string; count: number }[])
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 7)
                      .map((loc) => (
                        <tr key={loc.lokasi} className="hover:bg-gray-50/50">
                          <td className="p-4 font-bold text-slate-800 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-blue-500" />
                            {loc.lokasi}
                          </td>
                          <td className="p-4 text-center font-semibold text-slate-700">{loc.count}</td>
                          <td className="p-4 text-center text-xs font-semibold text-slate-500">
                            {Math.round((loc.count / totalAssets) * 100)}%
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
