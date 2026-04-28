"use client";

import { useState, useEffect, useMemo } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Calendar,
  User,
  Users,
  GraduationCap,
  CreditCard,
  AlertTriangle,
  X,
  Wallet, // Ikon untuk Tunai
  QrCode, // Ikon untuk QRIS
  FileSpreadsheet, // Ikon untuk ekspor Excel
} from "lucide-react";

// Definisi base URL untuk API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// --- INTERFACE DATA ---
interface Visitor {
  id: string;
  name: string;
  date: string;
  category: "reguler" | "santri" | "member" | "staff" | "ppmi";
  quantity: number;
  paymentMethod: "cash" | "qris";
}

interface ApiSaleData {
  id: number;
  customerName: string;
  Tanggal_Kunjungan: string;
  Kategori: "Reguler" | "PPMI" | "Santri" | "Member" | "Staff";
  Kuantitas: number;
  Metode_Pembayaran: "Cash" | "QRIS";
}

export default function PenjualanPage() {
  // --- STATE MANAGEMENT ---
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false); // <-- State baru untuk loading ekspor

  // State untuk semua kontrol filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDate, setSelectedDate] = useState(""); // Untuk kalender manual
  const [timeFilter, setTimeFilter] = useState("all"); // Untuk filter cepat (today, etc.)
  const [dateRange, setDateRange] = useState<{
    startDate: string | null;
    endDate: string | null;
  }>({ startDate: null, endDate: null });

  // --- FUNGSI HELPER TAMPILAN ---
  const getPaymentMethodLabel = (method: Visitor["paymentMethod"]) =>
    ({ cash: "Tunai", qris: "QRIS" }[method] || method);
  const getCategoryLabel = (category: Visitor["category"]) =>
    ({
      reguler: "Reguler",
      santri: "Santri",
      member: "Member",
      staff: "Staff",
      ppmi: "PPMI",
    }[category] || category);
  const getCategoryIcon = (category: Visitor["category"]) => {
    switch (category) {
      case "reguler":
        return <Users className="h-4 w-4 text-muted-foreground" />;
      case "santri":
        return <GraduationCap className="h-4 w-4 text-muted-foreground" />;
      case "member":
        return <CreditCard className="h-4 w-4 text-muted-foreground" />;
      case "staff":
        return <User className="h-4 w-4 text-muted-foreground" />;
      case "ppmi":
        return <Users className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Users className="h-4 w-4 text-muted-foreground" />;
    }
  };
  const getPaymentMethodIcon = (method: Visitor["paymentMethod"]) => {
    switch (method) {
      case "cash":
        return <Wallet className="h-4 w-4 text-muted-foreground" />;
      case "qris":
        return <QrCode className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Wallet className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // --- FUNGSI HELPER ---
  const formatDate = (date: Date): string => date.toISOString().split("T")[0];

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchVisitors = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setError("Akses ditolak. Anda belum login.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE_URL}/ticketing/sales?page=1&limit=1000`, // Ambil data lebih banyak untuk filter
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          if (response.status === 401)
            throw new Error("Sesi Anda telah berakhir. Silakan login kembali.");
          if (response.status === 403)
            throw new Error(
              "Anda tidak memiliki izin untuk mengakses data ini."
            );
          throw new Error(`Gagal mengambil data: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success && Array.isArray(result.data)) {
          const formattedVisitors: Visitor[] = result.data.map(
            (sale: ApiSaleData) => ({
              id: sale.id.toString(),
              name: sale.customerName,
              date: new Date(sale.Tanggal_Kunjungan)
                .toISOString()
                .split("T")[0],
              category: sale.Kategori.toLowerCase() as Visitor["category"],
              quantity: sale.Kuantitas,
              paymentMethod: (
                sale.Metode_Pembayaran || "cash"
              ).toLowerCase() as Visitor["paymentMethod"],
            })
          );
          setVisitors(formattedVisitors);
        } else {
          setError("Format data dari server tidak valid.");
        }
      } catch (err: any) {
        console.error("Gagal mengambil data pengunjung:", err);
        setError(`Terjadi kesalahan: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchVisitors();
  }, []);

  // --- HANDLER UNTUK KONTROL FILTER ---
  const handleTimeFilterChange = (filter: string) => {
    setTimeFilter(filter);
    setSelectedDate(""); // Reset pilihan tanggal manual
    const now = new Date();

    if (filter === "today") {
      const todayStr = formatDate(now);
      setDateRange({ startDate: todayStr, endDate: todayStr });
    } else if (filter === "thisWeek") {
      const currentDay = now.getDay(); // 0=Minggu, 1=Senin, ...
      const firstDayOfWeek = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - currentDay + (currentDay === 0 ? -6 : 1)
      ); // Set ke Senin
      const lastDayOfWeek = new Date(firstDayOfWeek);
      lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);
      setDateRange({
        startDate: formatDate(firstDayOfWeek),
        endDate: formatDate(lastDayOfWeek),
      });
    } else if (filter === "thismonth") {
      const year = now.getFullYear();
      const month = now.getMonth(); // 0 = Januari, 1 = Februari, dst.

      // Hari pertama bulan ini adalah tanggal 1
      const firstDayOfMonth = new Date(year, month, 1);

      // Hari terakhir bulan ini bisa didapat dengan mencari hari ke-0 dari bulan berikutnya
      const lastDayOfMonth = new Date(year, month + 1, 0);

      setDateRange({
        startDate: formatDate(firstDayOfMonth),
        endDate: formatDate(lastDayOfMonth),
      });
    } else if (filter === "thisYear") {
      const year = now.getFullYear();
      setDateRange({ startDate: `${year}-01-01`, endDate: `${year}-12-31` });
    } else {
      // 'all'
      setDateRange({ startDate: null, endDate: null });
    }
  };

  const handleManualDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
    setTimeFilter("custom"); // Menandakan filter manual sedang aktif
    setDateRange({ startDate: null, endDate: null }); // Reset filter rentang
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedDate("");
    handleTimeFilterChange("all"); // Set kembali ke 'Semua'
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Akses ditolak. Anda belum login.");
      }

      const response = await fetch(`${API_BASE_URL}/ticketing/export`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: "Gagal mengunduh file." }));
        throw new Error(errorData.message || `Error: ${response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;

      // Mendapatkan nama file dari header 'content-disposition'
      const contentDisposition = response.headers.get("content-disposition");
      let fileName = "laporan-penjualan.xlsx";
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (fileNameMatch && fileNameMatch.length > 1) {
          fileName = fileNameMatch[1];
        }
      }
      a.download = fileName;

      document.body.appendChild(a);
      a.click();

      // Membersihkan
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error("Gagal mengekspor data:", err);
      setError(`Gagal mengekspor: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // --- LOGIKA PEMROSESAN DATA (FILTER & STATISTIK) ---

  // 1. Memfilter data utama berdasarkan semua input
  const finalFilteredVisitors = useMemo(() => {
    return visitors.filter((visitor) => {
      const searchMatch =
        visitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getPaymentMethodLabel(visitor.paymentMethod)
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const categoryMatch = selectedCategory
        ? visitor.category === selectedCategory
        : true;

      let dateMatch = true;
      if (timeFilter === "custom" && selectedDate) {
        dateMatch = visitor.date === selectedDate;
      } else if (
        timeFilter !== "custom" &&
        dateRange.startDate &&
        dateRange.endDate
      ) {
        dateMatch =
          visitor.date >= dateRange.startDate &&
          visitor.date <= dateRange.endDate;
      }

      return searchMatch && categoryMatch && dateMatch;
    });
  }, [
    visitors,
    searchTerm,
    selectedCategory,
    selectedDate,
    dateRange,
    timeFilter,
  ]);

  // 2. Menghitung statistik berdasarkan data yang SUDAH difilter
  const summaryStats = useMemo(() => {
    const stats = {
      total: 0,
      reguler: 0,
      santri: 0,
      member: 0,
      staff: 0,
      ppmi: 0,
    };
    return finalFilteredVisitors.reduce((acc, visitor) => {
      acc.total += visitor.quantity;
      acc[visitor.category] = (acc[visitor.category] || 0) + visitor.quantity;
      return acc;
    }, stats);
  }, [finalFilteredVisitors]); // Bergantung pada data yang sudah difilter

  // --- TAMPILAN / JSX ---
  if (loading) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <div className="flex h-screen items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p>Memuat data penjualan...</p>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-auto min-h-16 shrink-0 flex-col items-start gap-4 border-b px-4 py-3 sm:flex-row sm:items-center md:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-6"
            />
            <h1 className="text-lg font-semibold">Daftar Penjualan Tiket</h1>
          </div>

          <div className="ml-auto flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Button
                variant={timeFilter === "today" ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimeFilterChange("today")}
              >
                Hari Ini
              </Button>
              <Button
                variant={timeFilter === "thisWeek" ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimeFilterChange("thisWeek")}
              >
                Minggu Ini
              </Button>
              <Button
                variant={timeFilter === "thismonth" ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimeFilterChange("thismonth")}
              >
                Bulan ini
              </Button>
              <Button
                variant={timeFilter === "thisYear" ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimeFilterChange("thisYear")}
              >
                Tahun Ini
              </Button>
              <Button
                variant={timeFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimeFilterChange("all")}
              >
                Semua
              </Button>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={handleManualDateChange}
                  className="w-full pl-8 sm:w-[180px]"
                />
              </div>
              <Select
                value={selectedCategory}
                onValueChange={(value) =>
                  setSelectedCategory(value === "all" ? "" : value)
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Semua Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  <SelectItem value="reguler">Reguler</SelectItem>
                  <SelectItem value="santri">Santri</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="ppmi">PPMI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative grow sm:grow-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama atau metode bayar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 sm:w-64"
              />
            </div>

            {/* --- TOMBOL EKSPOR BARU --- */}
            <Button
              onClick={handleExport}
              disabled={isExporting}
              variant="outline"
              size="sm"
              className="gap-1.5"
            >
              {isExporting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              Ekspor Excel
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={clearFilters}
              className="text-muted-foreground"
              aria-label="Hapus filter"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Pengunjung
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryStats.total.toLocaleString("id-ID")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reguler</CardTitle>
                {getCategoryIcon("reguler")}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryStats.reguler.toLocaleString("id-ID")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Santri</CardTitle>
                {getCategoryIcon("santri")}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryStats.santri.toLocaleString("id-ID")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Member</CardTitle>
                {getCategoryIcon("member")}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryStats.member.toLocaleString("id-ID")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Staff</CardTitle>
                {getCategoryIcon("staff")}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryStats.staff.toLocaleString("id-ID")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">PPMI</CardTitle>
                {getCategoryIcon("ppmi")}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryStats.ppmi.toLocaleString("id-ID")}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Rincian Penjualan</CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="font-medium">{error}</span>
                </div>
              )}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Pembeli</TableHead>
                      <TableHead>Tanggal Kunjungan</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Metode Pembayaran</TableHead>
                      <TableHead>Kuantitas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!error && finalFilteredVisitors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          {visitors.length > 0
                            ? "Tidak ada data yang cocok dengan filter Anda."
                            : "Tidak ada data penjualan yang ditemukan."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      finalFilteredVisitors.map((visitor) => (
                        <TableRow key={visitor.id}>
                          <TableCell className="font-medium">
                            {visitor.name}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {new Date(
                                visitor.date + "T00:00:00"
                              ).toLocaleDateString("id-ID", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1 w-fit"
                            >
                              {getCategoryIcon(visitor.category)}
                              {getCategoryLabel(visitor.category)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getPaymentMethodIcon(visitor.paymentMethod)}
                              {getPaymentMethodLabel(visitor.paymentMethod)}
                            </div>
                          </TableCell>
                          <TableCell>{visitor.quantity}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
