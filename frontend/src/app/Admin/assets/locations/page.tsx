'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Package,
  ArrowRight,
  TrendingUp,
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

interface LocationStat {
  lokasi: string;
  count: number;
  categories: Record<string, number>;
}

export default function LocationSummary() {
  const router = useRouter();
  const [locations, setLocations] = useState<LocationStat[]>([]);
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

  const fetchLocationsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      if (!token) return;

      // Fetch all assets, and aggregate in memory to get detailed location metrics
      const response = await fetch(`${API_BASE_URL}/assets?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        const assets = data.data.assets;
        
        // Aggregate
        const locMap: Record<string, { count: number; categories: Record<string, number> }> = {};
        
        assets.forEach((asset: any) => {
          const loc = asset.lokasi || 'Unknown';
          const cat = asset.kategori || 'Tanpa Kategori';
          
          if (!locMap[loc]) {
            locMap[loc] = { count: 0, categories: {} };
          }
          
          locMap[loc].count++;
          locMap[loc].categories[cat] = (locMap[loc].categories[cat] || 0) + 1;
        });

        const formattedStats: LocationStat[] = Object.entries(locMap).map(
          ([lokasi, info]) => ({
            lokasi,
            count: info.count,
            categories: info.categories
          })
        ).sort((a, b) => b.count - a.count);

        setLocations(formattedStats);
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
    fetchLocationsData();
  }, []);

  const handleViewInventory = (locationName: string) => {
    // Navigate to inventory page with the location as filter
    router.push(`/Admin/assets/inventory?lokasi=${encodeURIComponent(locationName)}`);
  };

  const getTopCategory = (categories: Record<string, number>) => {
    let topCat = 'N/A';
    let maxCount = 0;
    Object.entries(categories).forEach(([cat, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topCat = cat;
      }
    });
    return `${topCat} (${maxCount})`;
  };

  return (
    <div className="flex-1 flex flex-col w-full overflow-hidden bg-gray-50/50">
      <header className="border-b bg-white shadow-sm flex-shrink-0">
        <div className="flex min-h-[4rem] items-center px-6 justify-between">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              AOPS Location Summary
            </h1>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLocationsData} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Reload Locations
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* LOCATIONS LIST */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <Card key={idx} className="border border-gray-150 animate-pulse bg-white">
                  <CardContent className="h-40" />
                </Card>
              ))
            ) : locations.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500 font-medium bg-white rounded-lg border">
                Tidak ada data lokasi aset.
              </div>
            ) : (
              locations.map((loc) => (
                <Card
                  key={loc.lokasi}
                  className="shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5 bg-white flex flex-col justify-between"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <Badge className="bg-blue-100 hover:bg-blue-100 text-blue-800 border-blue-200 font-bold px-2.5 py-0.5">
                        {loc.count} Aset
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold text-gray-800 pt-3">
                      {loc.lokasi}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-3 pt-1">
                      {/* Top Category */}
                      <div className="flex items-center justify-between text-xs border-b border-gray-100 pb-2">
                        <span className="text-gray-400 font-medium flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          Kategori Utama:
                        </span>
                        <span className="font-bold text-gray-800">
                          {getTopCategory(loc.categories)}
                        </span>
                      </div>
                      {/* Breakdown */}
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                          Rincian Kategori:
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {Object.entries(loc.categories).map(([cat, count]) => (
                            <Badge
                              key={cat}
                              variant="outline"
                              className="text-[10px] bg-slate-50 border-slate-200 text-slate-700 py-0.5 px-2 font-medium"
                            >
                              {cat}: {count}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewInventory(loc.lokasi)}
                      className="w-full mt-5 text-blue-600 border-blue-200 hover:bg-blue-50 font-semibold flex items-center justify-center gap-1"
                    >
                      Lihat Inventaris Lokasi
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
