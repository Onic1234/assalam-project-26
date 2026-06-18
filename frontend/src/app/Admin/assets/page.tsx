'use client';

import { useState, useEffect } from 'react';
import {
  Package,
  Wrench,
  MapPin,
  Calendar,
  RefreshCw,
  TrendingUp,
  Shield,
  Loader2,
  AlertCircle
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Theme Colors
const COLORS = {
  primary: '#3b82f6', // blue
  success: '#10b981', // green
  warning: '#f59e0b', // amber
  danger: '#ef4444',  // red
  info: '#8b5cf6',    // purple
  slate: '#64748b'    // gray
};

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface StatData {
  totalAssets: number;
  needsMaintenance: number;
  topLocation: string;
  maintenanceThisMonth: number;
  assetsPerLocation: { lokasi: string; count: number }[];
  assetsPerCategory: { kategori: string; count: number }[];
  maintenanceSchedules: { month: string; count: number }[];
}

export default function AssetDashboard() {
  const [stats, setStats] = useState<StatData | null>(null);
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

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/assets/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch statistics');
      }
    } catch (error) {
      console.error('Error fetching asset statistics:', error);
      setError(
        error instanceof Error ? error.message : 'An unknown error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500 font-medium animate-pulse">Loading dashboard statistics...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8">
        <Alert variant="destructive" className="max-w-xl mx-auto">
          <AlertCircle className="h-5 w-5" />
          <AlertDescription className="text-base font-medium">
            {error || 'Failed to load statistics data.'}
          </AlertDescription>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={fetchStats} className="bg-white text-red-600 border-red-200 hover:bg-red-50">
              <RefreshCw className="w-4 h-4 mr-2" /> Retry
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  // Find percentage for categories
  const categoryTotal = stats.assetsPerCategory.reduce((acc, curr) => acc + curr.count, 0);
  const pieData = stats.assetsPerCategory.map(c => ({
    name: c.kategori || 'Tanpa Kategori',
    value: c.count
  }));

  // Top locations for chart (limit to top 8)
  const locationData = stats.assetsPerLocation.slice(0, 8);

  return (
    <div className="flex-1 flex flex-col w-full overflow-hidden bg-gray-50/50">
      <header className="border-b bg-white shadow-sm flex-shrink-0">
        <div className="flex min-h-[4rem] items-center px-6 justify-between">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              AOPS Asset & Inventory Management Dashboard
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={fetchStats} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1: Total Assets */}
            <Card className="relative overflow-hidden border-none shadow-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white transform transition-transform duration-300 hover:scale-[1.02]">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold tracking-wide uppercase text-blue-100">
                  Total Aset
                </CardTitle>
                <div className="p-2 bg-white/20 rounded-lg">
                  <Package className="h-6 w-6" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-extrabold tracking-tight">
                  {stats.totalAssets}
                </div>
                <p className="text-xs text-blue-100 mt-2 font-medium">
                  Aset terdaftar di database
                </p>
              </CardContent>
            </Card>

            {/* Card 2: Needs Maintenance */}
            <Card className="relative overflow-hidden border-none shadow-md bg-gradient-to-br from-red-500 to-orange-600 text-white transform transition-transform duration-300 hover:scale-[1.02]">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold tracking-wide uppercase text-red-100">
                  Perlu Maintenance
                </CardTitle>
                <div className="p-2 bg-white/20 rounded-lg">
                  <Wrench className="h-6 w-6" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-extrabold tracking-tight">
                  {stats.needsMaintenance}
                </div>
                <p className="text-xs text-red-100 mt-2 font-medium">
                  Status pending untuk April 2026
                </p>
              </CardContent>
            </Card>

            {/* Card 3: Top Location */}
            <Card className="relative overflow-hidden border-none shadow-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white transform transition-transform duration-300 hover:scale-[1.02]">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold tracking-wide uppercase text-emerald-100">
                  Lokasi Terbanyak
                </CardTitle>
                <div className="p-2 bg-white/20 rounded-lg">
                  <MapPin className="h-6 w-6" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold tracking-tight truncate">
                  {stats.topLocation}
                </div>
                <p className="text-xs text-emerald-100 mt-3 font-medium">
                  Lokasi dengan persebaran aset terpadat
                </p>
              </CardContent>
            </Card>

            {/* Card 4: Maintenance This Month */}
            <Card className="relative overflow-hidden border-none shadow-md bg-gradient-to-br from-purple-500 to-pink-600 text-white transform transition-transform duration-300 hover:scale-[1.02]">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl" />
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold tracking-wide uppercase text-purple-100">
                  Jadwal Bulan Ini
                </CardTitle>
                <div className="p-2 bg-white/20 rounded-lg">
                  <Calendar className="h-6 w-6" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-extrabold tracking-tight">
                  April = {stats.maintenanceThisMonth}
                </div>
                <p className="text-xs text-purple-100 mt-2 font-medium">
                  Aset terjadwal di bulan April
                </p>
              </CardContent>
            </Card>
          </div>

          {/* CHARTS LAYER 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Assets per Location (Bar Chart) */}
            <Card className="lg:col-span-2 shadow-sm border border-gray-100">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <MapPin className="text-blue-500 h-5 w-5" />
                  Jumlah Aset Per Lokasi
                </CardTitle>
                <CardDescription>Menampilkan top 8 lokasi dengan aset terbanyak</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={locationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="lokasi" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                    />
                    <Bar dataKey="count" fill="url(#colorLocation)" radius={[4, 4, 0, 0]}>
                      <defs>
                        <linearGradient id="colorLocation" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.8}/>
                        </linearGradient>
                      </defs>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Chart 2: Assets per Category (Pie Chart) */}
            <Card className="shadow-sm border border-gray-100">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <TrendingUp className="text-emerald-500 h-5 w-5" />
                  Proporsi Aset Per Kategori
                </CardTitle>
                <CardDescription>Berdasarkan 5 kategori utama aset</CardDescription>
              </CardHeader>
              <CardContent className="h-80 flex flex-col justify-between">
                <div className="h-[70%] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        formatter={(value: number) => [`${value} Aset`, 'Jumlah']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2 justify-center text-xs pb-2">
                  {pieData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-md">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                      <span className="font-semibold text-slate-700">{entry.name}</span>
                      <span className="text-slate-400">({entry.value})</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CHARTS LAYER 2 */}
          <Card className="shadow-sm border border-gray-100">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Calendar className="text-purple-500 h-5 w-5" />
                Jadwal Maintenance Per Bulan
              </CardTitle>
              <CardDescription>
                Frekuensi perawatan mesin, utility, dan furniture terdaftar sepanjang tahun
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.maintenanceSchedules} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMaint" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorMaint)" name="Maintenance" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
