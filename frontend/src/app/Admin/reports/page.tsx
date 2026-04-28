"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { TransactionSummaryTab } from "@/components/reports/transaction-summary-tab";
import { StudentBalancesTab } from "@/components/reports/student-balances-tab";
import { ProductAnalyticsTab } from "@/components/reports/product-analytics-tab";
import { DashboardOverview } from "@/components/reports/dashboard-overview";
import { Calendar, RefreshCw, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

// Types - These interfaces define what the UI components need
interface DashboardData {
  overview: {
    total_transactions: number;
    total_amount: number;
    average_transaction: number;
  };
  transactions: {
    summary: Record<string, { count: number; total_amount: number }>;
    recent_activity: Array<{
      id: number;
      type: string;
      customer_name: string;
      amount: number;
      time_ago: string;
    }>;
    hourly_pattern: Array<{ hour: number; transactions: number }>;
  };
  students: {
    total_students: number;
    total_balance: number;
    average_balance: number;
    students_with_balance: number;
    balance_distribution: Array<{ label: string; value: number }>;
  };
  products: {
    top_selling: Array<{
      product_name: string;
      total_sold: number;
    }>;
  };
  quick_stats: Array<{
    label: string;
    value: string | number;
    icon: string;
    color: string;
  }>;
}

interface TransactionSummaryData {
  overall_summary: {
    total_transactions: number;
    total_amount: number;
    average_per_transaction: number;
  };
  by_transaction_type: Record<
    string,
    {
      count: number;
      total_amount: number;
      average_amount: number;
    }
  >;
  daily_breakdown: Array<{
    date: string;
    transaction_count: number;
    total_amount: number;
  }>;
}

interface Student {
  id: number;
  NIS: string;
  NISN: string;
  Nama: string;
  username: string;
  Balance: number;
  is_active: boolean;
}

interface StudentBalancesData {
  students: Student[];
  statistics: {
    total_students: number;
    total_balance: number;
    average_balance: number;
    min_balance: number;
    max_balance: number;
  };
  balance_distribution: Array<{
    range: string;
    count: number;
  }>;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

interface BestSellingProduct {
  productId: number;
  name: string;
  currentPrice: number;
  currentStock: number;
  totalQuantitySold: number;
  totalRevenue: number;
}

interface PopularCategory {
  category_id: number;
  category_name: string;
  total_items_sold: number;
  total_transactions: number;
  unique_products: number;
  total_revenue: number;
  average_per_transaction: number;
  top_products: Array<{
    product_id: number;
    product_name: string;
    total_sold: number;
  }>;
}

interface ProductAnalyticsData {
  bestSellingProducts: BestSellingProduct[];
  popularCategories: PopularCategory[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function ReportsPage() {
  const [period, setPeriod] = useState("today");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false); // <-- STATE BARU
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [transactionData, setTransactionData] =
    useState<TransactionSummaryData | null>(null);
  const [studentData, setStudentData] = useState<StudentBalancesData | null>(
    null
  );
  const [productData, setProductData] = useState<ProductAnalyticsData | null>(
    null
  );

  // Helper function to create authentication headers
  const getAuthHeaders = (includeContentType = true) => {
    const headers: HeadersInit = {
      Authorization: `Bearer ${localStorage.getItem("authToken")}`,
    };
    if (includeContentType) {
      headers["Content-Type"] = "application/json";
    }
    return headers;
  };

  useEffect(() => {
    fetchAllData();
  }, [period]);

  const handleExport = async () => {
    setIsExporting(true);
    const exportToast = toast.loading("Mempersiapkan laporan Excel Anda...");

    try {
      // Menggunakan periode yang sedang aktif di state
      const periodQuery =
        period === "all" ? "all" : mapPeriodQuery(period).split("=")[1];
      const url = `${API_BASE_URL}/reports/export/excel?period=${periodQuery}`;

      const response = await fetch(url, { headers: getAuthHeaders(false) });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Gagal mengekspor: ${errorText || response.statusText}`
        );
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      const date = new Date().toISOString().split("T")[0];
      link.setAttribute("download", `laporan-lengkap-${period}-${date}.xlsx`); // <-- ubah ke .xlsx
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success("Laporan berhasil diunduh!", { id: exportToast });
    } catch (err: any) {
      console.error("Export Error:", err);
      toast.error(`Ekspor gagal: ${err.message}`, { id: exportToast });
    } finally {
      setIsExporting(false);
    }
  };
  const handleRefresh = () => {
    setIsRefreshing(true);
    setLastUpdated(new Date());
    fetchAllData();
  };

  const handleApiError = (error: any, defaultMessage: string) => {
    console.error("API Error:", error);
    let errorMessage = defaultMessage;
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    setError(errorMessage);
    toast.error(errorMessage);
  };

  // This function orchestrates all fetching and data transformation
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel from the backend endpoints
      const [
        dashboardRes,
        transactionRes,
        studentRes,
        productsRes,
        categoriesRes,
        dailyGraphRes,
        recentActivityRes, // <-- Ditambahkan
        hourlyPatternRes, // <-- Ditambahkan
      ] = await Promise.all([
        fetchDashboardData(),
        fetchRawTransactionSummary(),
        fetchRawStudentBalances(),
        fetchRawBestSellingProducts(),
        fetchRawPopularCategories(),
        fetchDailyGraphData(),
        fetchRecentActivity(), // <-- Ditambahkan
        fetchHourlyPattern(), // <-- Ditambahkan
      ]);

      // Transform and set state
      setDashboardData(
        transformDashboardData(
          dashboardRes,
          studentRes,
          productsRes,
          recentActivityRes,
          hourlyPatternRes
        )
      );
      setTransactionData(
        transformTransactionSummary(transactionRes, dailyGraphRes)
      );
      setStudentData(transformStudentBalances(studentRes));
      setProductData(transformProductAnalytics(productsRes, categoriesRes));
    } catch (err) {
      handleApiError(err, "An error occurred while fetching data");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Maps frontend period state to backend API query param
  const mapPeriodQuery = (p: string): string => {
    let periodValue = "";
    switch (p) {
      case "today":
        periodValue = "daily";
        break;
      case "week":
        periodValue = "weekly";
        break;
      case "month":
        periodValue = "monthly";
        break;
      case "year":
        periodValue = "yearly";
        break;
      default:
        return ""; // For "all", return empty string
    }
    return `period=${periodValue}`;
  };

  // --- RAW DATA FETCHING FUNCTIONS ---
  const fetchDashboardData = async () => {
    const response = await fetch(`${API_BASE_URL}/reports/dashboard`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch dashboard data");
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    return result.data;
  };

  const fetchRawTransactionSummary = async () => {
    const query = mapPeriodQuery(period);
    const url = query
      ? `${API_BASE_URL}/reports/summary?${query}`
      : `${API_BASE_URL}/reports/summary`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error("Failed to fetch transaction summary");
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    return result.data;
  };

  const fetchDailyGraphData = async () => {
    const query = mapPeriodQuery(period);
    const url = query
      ? `${API_BASE_URL}/reports/daily-graph?${query}`
      : `${API_BASE_URL}/reports/daily-graph`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error("Failed to fetch daily graph data");
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    return result.data;
  };

  const fetchRawStudentBalances = async () => {
    const response = await fetch(`${API_BASE_URL}/reports/santri-balances`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch student balances");
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    return result.data;
  };

  const fetchRawBestSellingProducts = async () => {
    const query = mapPeriodQuery(period);
    const url = query
      ? `${API_BASE_URL}/reports/top-products?limit=20&${query}`
      : `${API_BASE_URL}/reports/top-products?limit=20`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error("Failed to fetch best selling products");
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    return result.data;
  };

  const fetchRawPopularCategories = async () => {
    const query = mapPeriodQuery(period);
    const url = query
      ? `${API_BASE_URL}/reports/popular-categories?${query}`
      : `${API_BASE_URL}/reports/popular-categories`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error("Failed to fetch popular categories");
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    return result.data;
  };

  // FUNGSI FETCH BARU untuk aktivitas terkini
  const fetchRecentActivity = async () => {
    const response = await fetch(`${API_BASE_URL}/reports/recent-activity`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch recent activity");
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    return result.data;
  };

  // FUNGSI FETCH BARU untuk pola per jam
  const fetchHourlyPattern = async () => {
    const query = mapPeriodQuery(period);
    const url = query
      ? `${API_BASE_URL}/reports/hourly-pattern?${query}`
      : `${API_BASE_URL}/reports/hourly-pattern`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error("Failed to fetch hourly pattern data");
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    return result.data;
  };

  // --- DATA TRANSFORMATION FUNCTIONS ---
  const transformDashboardData = (
    rawData: any,
    studentData: any[],
    topProducts: any[],
    recentActivity: any[],
    hourlyPatternData: any[]
  ): DashboardData => {
    const totalBalance = studentData.reduce(
      (sum, s) => sum + (s.balance?.amount || 0),
      0
    );
    const studentsWithBalance = studentData.filter(
      (s) => (s.balance?.amount || 0) > 0
    ).length;

    const balanceRanges = [
      { label: "Rp 0", value: 0 },
      { label: "Rp 1 - 50k", value: 0 },
      { label: "Rp 50k - 100k", value: 0 },
      { label: "> Rp 100k", value: 0 },
    ];

    studentData.forEach((s) => {
      const balance = s.balance?.amount || 0;
      if (balance === 0) balanceRanges[0].value++;
      else if (balance <= 50000) balanceRanges[1].value++;
      else if (balance <= 100000) balanceRanges[2].value++;
      else balanceRanges[3].value++;
    });

    return {
      overview: {
        total_transactions: rawData.todayStats?.transactions || 0,
        total_amount: rawData.todayStats?.revenue || 0,
        average_transaction:
          rawData.todayStats?.transactions > 0
            ? rawData.todayStats.revenue / rawData.todayStats.transactions
            : 0,
      },
      transactions: {
        summary: {},
        recent_activity: recentActivity.map((activity) => ({
          id: activity.id,
          type: activity.type,
          customer_name: activity.customer_name || "Umum",
          amount: activity.amount || 0, // Menggunakan 'amount' sesuai API
          time_ago: new Date(activity.createdAt).toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        })),
        hourly_pattern: hourlyPatternData,
      },
      students: {
        total_students: rawData.totalSantri || 0,
        total_balance: totalBalance,
        average_balance:
          rawData.totalSantri > 0 ? totalBalance / rawData.totalSantri : 0,
        students_with_balance: studentsWithBalance,
        balance_distribution: balanceRanges,
      },
      products: {
        top_selling: topProducts.map((product) => ({
          product_name: product.name || "Produk Tidak Dikenal",
          total_sold: product.totalQuantitySold || 0,
        })),
      },
      quick_stats: [
        {
          label: "Total Students",
          value: rawData.totalSantri || 0,
          icon: "users",
          color: "blue",
        },
        {
          label: "Total Balance",
          value: `Rp ${totalBalance.toLocaleString("id-ID")}`,
          icon: "wallet",
          color: "green",
        },
        {
          label: "Today's Transactions",
          value: rawData.todayStats?.transactions || 0,
          icon: "shopping-cart",
          color: "purple",
        },
        {
          label: "Today's Revenue",
          value: `Rp ${(rawData.todayStats?.revenue || 0).toLocaleString(
            "id-ID"
          )}`,
          icon: "trending-up",
          color: "orange",
        },
      ],
    };
  };

  const transformTransactionSummary = (
    rawData: any,
    dailyGraphData: any[]
  ): TransactionSummaryData => {
    const by_transaction_type =
      rawData.breakdown?.reduce((acc: any, item: any) => {
        const type = item.payment_method === "TopUp" ? "TopUp" : "Purchase";
        if (!acc[type]) {
          acc[type] = { count: 0, total_amount: 0, average_amount: 0 };
        }
        acc[type].count += Number.parseInt(item.transactionCount, 10);
        acc[type].total_amount += Number.parseFloat(item.totalAmount);
        return acc;
      }, {}) || {};

    for (const type in by_transaction_type) {
      if (by_transaction_type[type].count > 0) {
        by_transaction_type[type].average_amount =
          by_transaction_type[type].total_amount /
          by_transaction_type[type].count;
      }
    }

    const total_amount =
      (rawData.totalTopUp || 0) + (rawData.totalPurchase || 0);

    return {
      overall_summary: {
        total_transactions: rawData.totalTransactions || 0,
        total_amount: total_amount,
        average_per_transaction:
          rawData.totalTransactions > 0
            ? total_amount / rawData.totalTransactions
            : 0,
      },
      by_transaction_type,
      daily_breakdown:
        dailyGraphData?.map((d) => ({
          date: d.date,
          transaction_count: Number.parseInt(d.totalRevenue, 10) || 0,
          total_amount: Number.parseFloat(d.totalRevenue) || 0,
        })) || [],
    };
  };

  const transformStudentBalances = (
    rawData: any[],
    page = 1,
    limit = 10
  ): StudentBalancesData => {
    const total_students = rawData.length;
    const balances = rawData.map((s) => s.balance?.amount || 0);
    const total_balance = balances.reduce((sum, b) => sum + b, 0);

    // Client-side pagination
    const paginatedStudents = rawData.slice((page - 1) * limit, page * limit);

    return {
      students: paginatedStudents.map((student: any) => ({
        id: student.id,
        NIS: student.id_santri || "N/A",
        NISN: student.nisn || "N/A",
        Nama: student.nama_santri || "N/A",
        username: student.username || "N/A",
        Balance: student.balance?.amount || 0,
        is_active: student.is_active !== undefined ? student.is_active : true,
      })),
      statistics: {
        total_students: total_students,
        total_balance: total_balance,
        average_balance:
          total_students > 0 ? total_balance / total_students : 0,
        min_balance: total_students > 0 ? Math.min(...balances) : 0,
        max_balance: total_students > 0 ? Math.max(...balances) : 0,
      },
      balance_distribution: [
        { range: "Rp 0", count: balances.filter((b) => b === 0).length },
        {
          range: "Rp 1 - 50k",
          count: balances.filter((b) => b > 0 && b <= 50000).length,
        },
        {
          range: "Rp 50k - 100k",
          count: balances.filter((b) => b > 50000 && b <= 100000).length,
        },
        {
          range: "> Rp 100k",
          count: balances.filter((b) => b > 100000).length,
        },
      ],
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total_students / limit),
        totalItems: total_students,
        itemsPerPage: limit,
      },
    };
  };

  const transformProductAnalytics = (
    products: any[],
    categories: any[]
  ): ProductAnalyticsData => {
    return {
      bestSellingProducts:
        products?.map((p) => ({
          // Memetakan langsung dari respons backend ke interface frontend
          productId: p.productId,
          name: p.name,
          currentPrice: p.currentPrice,
          currentStock: p.currentStock,
          totalQuantitySold: p.totalQuantitySold,
          totalRevenue: p.totalRevenue,
        })) || [],
      popularCategories:
        categories?.map((c) => ({
          // Memetakan data dari backend (camelCase) ke format yang diharapkan (snake_case)
          category_id: c.categoryId || 0,
          category_name: c.categoryName || "Unknown Category",
          total_items_sold: c.totalItemsSold || 0,
          transaction_count: c.transactionCount || 0,
          unique_products: c.uniqueProductsSold || 0,
          total_revenue: c.totalRevenue || 0,
          average_per_transaction: c.averageItemsPerTransaction || 0,
          top_products: [], // Diasumsikan top_products tidak ada di respons ini
        })) || [],
    };
  };
  if (error) {
    return (
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center border-b px-4 md:px-6">
            <h1 className="text-lg font-semibold">Reports & Analytics</h1>
          </header>
          <main className="flex-1 p-4 md:p-6">
            <Card>
              <CardContent className="flex items-center justify-center h-[400px]">
                <div className="text-center">
                  <p className="text-destructive mb-2">
                    Error loading reports data
                  </p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <Button onClick={fetchAllData} className="mt-4">
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center border-b px-4 md:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-6"
            />
            <h1 className="text-lg font-semibold">Reports & Analytics</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[140px] h-8">
                <Calendar className="h-3.5 w-3.5 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 bg-transparent"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline-block">Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 bg-transparent"
              onClick={handleExport}
              disabled={isExporting}
            >
              <Download
                className={`h-3.5 w-3.5 ${isExporting ? "animate-pulse" : ""}`}
              />
              <span className="hidden sm:inline-block">
                {isExporting ? "Mengekspor..." : "Export"}
              </span>
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleString("id-ID")}
            </p>
          </div>

          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <DashboardOverview data={dashboardData} loading={loading} />
            </TabsContent>

            <TabsContent value="transactions">
              <TransactionSummaryTab data={transactionData} loading={loading} />
            </TabsContent>

            <TabsContent value="products">
              <ProductAnalyticsTab data={productData} loading={loading} />
            </TabsContent>

            <TabsContent value="students">
              <StudentBalancesTab
                data={studentData}
                loading={loading}
                onRefresh={fetchAllData}
              />
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
