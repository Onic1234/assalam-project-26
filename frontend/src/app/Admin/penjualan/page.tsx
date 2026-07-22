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
  Coins, // Ikon untuk pendapatan
  Edit,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

// Definisi base URL untuk API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// --- INTERFACE DATA ---
interface Visitor {
  id: string;
  name: string;
  date: string;
  category: "reguler" | "santri" | "member" | "staff" | "ppmi" | "card special";
  quantity: number;
  paymentMethod: "cash" | "qris" | "card_member";
  idMember?: string;
}

interface ApiSaleData {
  id: number;
  customerName: string;
  Tanggal_Kunjungan: string;
  Kategori: string;
  Kuantitas: number;
  Metode_Pembayaran: string;
  id_member?: string;
}

export default function PenjualanPage() {
  // --- STATE MANAGEMENT ---
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false); // <-- State baru untuk loading ekspor
  const [ticketPrices, setTicketPrices] = useState<{
    reguler: number;
    staff: number;
  }>({ reguler: 25000, staff: 15000 }); // Default fallbacks

  // State untuk semua kontrol filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDate, setSelectedDate] = useState(""); // Untuk kalender manual
  const [timeFilter, setTimeFilter] = useState("all"); // Untuk filter cepat (today, etc.)
  const [dateRange, setDateRange] = useState<{
    startDate: string | null;
    endDate: string | null;
  }>({ startDate: null, endDate: null });

  // State untuk Edit & Delete Transaksi
  const [editingVisitor, setEditingVisitor] = useState<Visitor | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    date: string;
    category: Visitor["category"];
    quantity: number;
    paymentMethod: Visitor["paymentMethod"];
  }>({
    name: "",
    date: "",
    category: "reguler",
    quantity: 1,
    paymentMethod: "cash",
  });

  const handleOpenEdit = (visitor: Visitor) => {
    setEditingVisitor(visitor);
    setEditForm({
      name: visitor.name,
      date: visitor.date,
      category: visitor.category,
      quantity: visitor.quantity,
      paymentMethod: visitor.paymentMethod,
    });
    setIsEditOpen(true);
  };

  const handleUpdateSale = async () => {
    if (!editingVisitor) return;
    const token = localStorage.getItem("authToken");
    if (!token) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/ticketing/sales/${editingVisitor.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Kuantitas: editForm.quantity,
          Metode_Pembayaran:
            editForm.paymentMethod === "qris"
              ? "QRIS"
              : editForm.paymentMethod === "card_member"
              ? "card_member"
              : "Tunai",
          Tanggal_Kunjungan: editForm.date,
          Kategori:
            editForm.category === "card special"
              ? "Card Special"
              : editForm.category.charAt(0).toUpperCase() + editForm.category.slice(1),
          customerName: editForm.name,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Gagal memperbarui transaksi.");
      }

      setVisitors((prev) =>
        prev.map((v) =>
          v.id === editingVisitor.id
            ? {
                ...v,
                name: editForm.name,
                date: editForm.date,
                category: editForm.category,
                quantity: editForm.quantity,
                paymentMethod: editForm.paymentMethod,
              }
            : v
        )
      );

      toast({
        title: "Berhasil",
        description: "Data transaksi penjualan berhasil diperbarui.",
      });
      setIsEditOpen(false);
      setEditingVisitor(null);
    } catch (err: any) {
      console.error("Error updating sale:", err);
      toast({
        title: "Gagal",
        description: err.message || "Gagal memperbarui data transaksi.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteSale = async (id: string) => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    setIsDeleting(true);
    setDeletingId(id);
    try {
      const response = await fetch(`${API_BASE_URL}/ticketing/sales/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Gagal menghapus transaksi.");
      }

      setVisitors((prev) => prev.filter((v) => v.id !== id));

      toast({
        title: "Berhasil",
        description: "Data transaksi penjualan berhasil dihapus.",
      });
    } catch (err: any) {
      console.error("Error deleting sale:", err);
      toast({
        title: "Gagal",
        description: err.message || "Gagal menghapus data transaksi.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  // --- FUNGSI HELPER TAMPILAN ---
  const getPaymentMethodLabel = (method: Visitor["paymentMethod"]) =>
    ({ cash: "Tunai", qris: "QRIS", card_member: "Saldo Kartu" }[method] || method);
  const getCategoryLabel = (category: Visitor["category"]) =>
    ({
      reguler: "Reguler",
      santri: "Santri",
      member: "Member",
      staff: "Staff",
      ppmi: "PPMI",
      "card special": "Card Special",
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
      case "card special":
        return <CreditCard className="h-4 w-4 text-muted-foreground" />;
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
      case "card_member":
        return <CreditCard className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Wallet className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

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
              date: formatDate(new Date(sale.Tanggal_Kunjungan)),
              category: sale.Kategori.toLowerCase() as Visitor["category"],
              quantity: sale.Kuantitas,
              paymentMethod: (
                sale.Metode_Pembayaran || "cash"
              ).toLowerCase() === "qris"
                ? "qris"
                : (sale.Metode_Pembayaran || "cash").toLowerCase() === "card_member"
                ? "card_member"
                : "cash",
              idMember: sale.id_member,
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

  // Fetch ticket prices for revenue calculation
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) return;
        const response = await fetch(`${API_BASE_URL}/ticketing/prices`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const prices = await response.json();
          const pricesObj = { reguler: 25000, staff: 15000 };
          prices.forEach((p: any) => {
            const finalPrice = p.harga * (1 - (p.discountPercentage || 0) / 100);
            if (p.kategori === "Reguler") {
              pricesObj.reguler = finalPrice;
            } else if (p.kategori === "Staff") {
              pricesObj.staff = finalPrice;
            }
          });
          setTicketPrices(pricesObj);
        }
      } catch (err) {
        console.error("Gagal mengambil harga tiket:", err);
      }
    };

    fetchPrices();
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
      if (visitor.category in acc) {
        (acc as any)[visitor.category] += visitor.quantity;
      }
      return acc;
    }, stats);
  }, [finalFilteredVisitors]); // Bergantung pada data yang sudah difilter

  // Filter data untuk statistik periode (mengabaikan filter tanggal agar data periode tetap utuh)
  const categoryAndSearchFiltered = useMemo(() => {
    return visitors.filter((visitor) => {
      const searchMatch =
        visitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getPaymentMethodLabel(visitor.paymentMethod)
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      const categoryMatch = selectedCategory
        ? visitor.category === selectedCategory
        : true;

      return searchMatch && categoryMatch;
    });
  }, [visitors, searchTerm, selectedCategory]);

  // Definisikan tanggal awal/akhir untuk setiap periode
  const periods = useMemo(() => {
    const now = new Date();
    
    // Today
    const todayStr = formatDate(now);
    
    // This Week (Senin - Minggu)
    const currentDay = now.getDay();
    const firstDayOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - currentDay + (currentDay === 0 ? -6 : 1)
    );
    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);
    const thisWeekStart = formatDate(firstDayOfWeek);
    const thisWeekEnd = formatDate(lastDayOfWeek);
    
    // This Month
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const thisMonthStart = formatDate(firstDayOfMonth);
    const thisMonthEnd = formatDate(lastDayOfMonth);
    
    // This Year
    const thisYearStart = `${now.getFullYear()}-01-01`;
    const thisYearEnd = `${now.getFullYear()}-12-31`;

    return {
      today: todayStr,
      weekStart: thisWeekStart,
      weekEnd: thisWeekEnd,
      monthStart: thisMonthStart,
      monthEnd: thisMonthEnd,
      yearStart: thisYearStart,
      yearEnd: thisYearEnd,
    };
  }, []);

  // Hitung statistik transaksi (pendapatan) untuk 4 periode
  const periodStats = useMemo(() => {
    const stats = {
      today: { total: 0, cash: 0, qris: 0 },
      week: { total: 0, cash: 0, qris: 0 },
      month: { total: 0, cash: 0, qris: 0 },
      year: { total: 0, cash: 0, qris: 0 },
    };

    categoryAndSearchFiltered.forEach((visitor) => {
      let price = 0;
      if (visitor.category === "reguler" || visitor.category === "card special") {
        price = ticketPrices.reguler;
      } else if (visitor.category === "staff") {
        price = ticketPrices.staff;
      }
      const amount = visitor.quantity * price;
      const date = visitor.date;
      const isQris = visitor.paymentMethod === "qris";

      // Today
      if (date === periods.today) {
        stats.today.total += amount;
        if (isQris) stats.today.qris += amount;
        else stats.today.cash += amount;
      }
      // This Week
      if (date >= periods.weekStart && date <= periods.weekEnd) {
        stats.week.total += amount;
        if (isQris) stats.week.qris += amount;
        else stats.week.cash += amount;
      }
      // This Month
      if (date >= periods.monthStart && date <= periods.monthEnd) {
        stats.month.total += amount;
        if (isQris) stats.month.qris += amount;
        else stats.month.cash += amount;
      }
      // This Year
      if (date >= periods.yearStart && date <= periods.yearEnd) {
        stats.year.total += amount;
        if (isQris) stats.year.qris += amount;
        else stats.year.cash += amount;
      }
    });

    return stats;
  }, [categoryAndSearchFiltered, ticketPrices, periods]);

  // 4. Menghitung statistik transaksi untuk pilihan/filter aktif saat ini
  const transactionStats = useMemo(() => {
    let totalRevenue = 0;
    let cashRevenue = 0;
    let qrisRevenue = 0;

    finalFilteredVisitors.forEach((visitor) => {
      let price = 0;
      if (visitor.category === "reguler" || visitor.category === "card special") {
        price = ticketPrices.reguler;
      } else if (visitor.category === "staff") {
        price = ticketPrices.staff;
      }
      
      const amount = visitor.quantity * price;
      totalRevenue += amount;
      
      if (visitor.paymentMethod === "cash") {
        cashRevenue += amount;
      } else if (visitor.paymentMethod === "qris") {
        qrisRevenue += amount;
      }
    });

    return {
      total: totalRevenue,
      cash: cashRevenue,
      qris: qrisRevenue,
    };
  }, [finalFilteredVisitors, ticketPrices]);

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

          {/* --- STATISTIK KEUANGAN --- */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">Statistik Pendapatan</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {/* Berdasarkan Filter */}
              <Card className="bg-slate-900 text-slate-50 border-slate-800 dark:bg-slate-950 dark:border-slate-800 shadow-md ring-2 ring-slate-800/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Berdasarkan Filter
                  </CardTitle>
                  <Coins className="h-4 w-4 text-amber-400" />
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <div className="text-xl font-bold text-white">
                    Rp {transactionStats.total.toLocaleString("id-ID")}
                  </div>
                  <div className="flex justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Wallet className="h-3 w-3 text-slate-300" /> Tunai: Rp {transactionStats.cash.toLocaleString("id-ID")}</span>
                    <span className="flex items-center gap-1"><QrCode className="h-3 w-3 text-slate-300" /> QRIS: Rp {transactionStats.qris.toLocaleString("id-ID")}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Hari Ini */}
              <Card className="bg-green-50/50 dark:bg-green-950/10 border-green-100 dark:border-green-900/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-xs font-semibold text-green-800 dark:text-green-300 uppercase tracking-wider">
                    Hari Ini
                  </CardTitle>
                  <Coins className="h-4 w-4 text-green-600 dark:text-green-400" />
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <div className="text-xl font-bold text-green-700 dark:text-green-200">
                    Rp {periodStats.today.total.toLocaleString("id-ID")}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Wallet className="h-3 w-3" /> Tunai: Rp {periodStats.today.cash.toLocaleString("id-ID")}</span>
                    <span className="flex items-center gap-1"><QrCode className="h-3 w-3" /> QRIS: Rp {periodStats.today.qris.toLocaleString("id-ID")}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Minggu Ini */}
              <Card className="bg-blue-50/50 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                    Minggu Ini
                  </CardTitle>
                  <Coins className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <div className="text-xl font-bold text-blue-700 dark:text-blue-200">
                    Rp {periodStats.week.total.toLocaleString("id-ID")}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Wallet className="h-3 w-3" /> Tunai: Rp {periodStats.week.cash.toLocaleString("id-ID")}</span>
                    <span className="flex items-center gap-1"><QrCode className="h-3 w-3" /> QRIS: Rp {periodStats.week.qris.toLocaleString("id-ID")}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Bulan Ini */}
              <Card className="bg-purple-50/50 dark:bg-purple-950/10 border-purple-100 dark:border-purple-900/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-xs font-semibold text-purple-800 dark:text-purple-300 uppercase tracking-wider">
                    Bulan Ini
                  </CardTitle>
                  <Coins className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <div className="text-xl font-bold text-purple-700 dark:text-purple-200">
                    Rp {periodStats.month.total.toLocaleString("id-ID")}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Wallet className="h-3 w-3" /> Tunai: Rp {periodStats.month.cash.toLocaleString("id-ID")}</span>
                    <span className="flex items-center gap-1"><QrCode className="h-3 w-3" /> QRIS: Rp {periodStats.month.qris.toLocaleString("id-ID")}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Tahun Ini */}
              <Card className="bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                    Tahun Ini
                  </CardTitle>
                  <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <div className="text-xl font-bold text-amber-700 dark:text-amber-200">
                    Rp {periodStats.year.total.toLocaleString("id-ID")}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Wallet className="h-3 w-3" /> Tunai: Rp {periodStats.year.cash.toLocaleString("id-ID")}</span>
                    <span className="flex items-center gap-1"><QrCode className="h-3 w-3" /> QRIS: Rp {periodStats.year.qris.toLocaleString("id-ID")}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
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
                      <TableHead className="text-right font-semibold">Total Harga</TableHead>
                      <TableHead className="text-center font-semibold">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!error && finalFilteredVisitors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          {visitors.length > 0
                            ? "Tidak ada data yang cocok dengan filter Anda."
                            : "Tidak ada data penjualan yang ditemukan."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      finalFilteredVisitors.map((visitor) => (
                        <TableRow key={visitor.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="text-slate-900 font-semibold">{visitor.name}</span>
                              {visitor.idMember && (
                                <span className="text-[10px] text-indigo-600 font-mono mt-0.5 font-bold" title="UID Kartu Member">
                                  Card: {visitor.idMember}
                                </span>
                              )}
                            </div>
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
                          <TableCell className="text-right font-medium">
                            Rp {(() => {
                              let price = 0;
                              if (visitor.category === "reguler" || visitor.category === "card special") {
                                price = ticketPrices.reguler;
                              } else if (visitor.category === "staff") {
                                price = ticketPrices.staff;
                              }
                              return (visitor.quantity * price).toLocaleString("id-ID");
                            })()}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                                onClick={() => handleOpenEdit(visitor)}
                                title="Edit Transaksi"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600 hover:text-red-800 hover:bg-red-50"
                                    title="Hapus Transaksi"
                                    disabled={isDeleting && deletingId === visitor.id}
                                  >
                                    {isDeleting && deletingId === visitor.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Hapus Transaksi Penjualan</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Apakah Anda yakin ingin menghapus data transaksi milik <strong>{visitor.name}</strong> (Tanggal: {visitor.date})? Tindakan ini tidak dapat dibatalkan.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteSale(visitor.id)}
                                      className="bg-red-600 hover:bg-red-700 text-white"
                                    >
                                      Hapus Transaksi
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Modal Edit Transaksi */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Transaksi Penjualan</DialogTitle>
              </DialogHeader>
              {editingVisitor && (
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Nama Pembeli</Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-date">Tanggal Kunjungan</Label>
                    <Input
                      id="edit-date"
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Kategori</Label>
                    <Select
                      value={editForm.category}
                      onValueChange={(val) => setEditForm({ ...editForm, category: val as Visitor["category"] })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reguler">Reguler</SelectItem>
                        <SelectItem value="santri">Santri</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="ppmi">PPMI</SelectItem>
                        <SelectItem value="card special">Card Special</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Metode Pembayaran</Label>
                    <Select
                      value={editForm.paymentMethod}
                      onValueChange={(val) => setEditForm({ ...editForm, paymentMethod: val as Visitor["paymentMethod"] })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Metode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Tunai</SelectItem>
                        <SelectItem value="qris">QRIS</SelectItem>
                        <SelectItem value="card_member">Saldo Kartu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-qty">Kuantitas Tiket</Label>
                    <Input
                      id="edit-qty"
                      type="number"
                      min={1}
                      value={editForm.quantity}
                      onChange={(e) => setEditForm({ ...editForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={isUpdating}>
                  Batal
                </Button>
                <Button onClick={handleUpdateSale} disabled={isUpdating} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
