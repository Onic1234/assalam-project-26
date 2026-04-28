'use client';

import { useState, useEffect } from 'react';
import {
  Download,
  RefreshCw,
  Search,
  Calendar,
  Filter,
  User,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { TransactionsTable } from '@/components/transactions-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Interfaces matching the backend (Sequelize models)
interface Santri {
  id: number;
  nama_santri: string;
  id_santri: string; // This is the NIS
}

interface Kasir {
  id: number;
  username: string;
}

interface Transaction {
  id: number;
  santriId: number | null;
  kasirId: number;
  total_amount: number;
  payment_method: 'TopUp' | 'Saldo' | 'Tunai' | 'QRIS';
  createdAt: string;
  updatedAt: string;
  santri?: Santri;
  kasir: Kasir;
}

interface UserTransactionData {
  student: Santri;
  transactions: Transaction[];
  totalItems: number;
}

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedType, setSelectedType] = useState('all');

  // User-specific transaction states
  const [userSearchDialog, setUserSearchDialog] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState(''); // Should be Santri ID
  const [userTransactionData, setUserTransactionData] =
    useState<UserTransactionData | null>(null);
  const [userTransactionLoading, setUserTransactionLoading] = useState(false);
  const [userTransactionError, setUserTransactionError] = useState<
    string | null
  >(null);

  // Refetch transactions when filters or page change
  useEffect(() => {
    fetchTransactions();
  }, [currentPage, selectedType, selectedDate]);

  // Handle search query with a debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchTransactions();
    }, 500); // Debounce search input
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('authToken');
    if (!token) {
      setError('Authentication token not found. Please log in again.');
      // Arahkan ke halaman login
      window.location.href = '/login';
      return null;
    }
    return token;
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getAuthToken();
      if (!token) return;

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });

      if (selectedDate) {
        params.append('startDate', new Date(selectedDate).toISOString());
        const endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);
        params.append('endDate', endDate.toISOString());
      }

      const response = await fetch(`${API_BASE_URL}/transactions?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        let filteredData = data.data.transactions;

        // Client-side filtering for search query as backend does not support it
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          filteredData = filteredData.filter(
            (tx: Transaction) =>
              tx.santri?.nama_santri.toLowerCase().includes(query) ||
              tx.santri?.id_santri.toLowerCase().includes(query)
          );
        }

        // Client-side filtering for type
        if (selectedType !== 'all') {
          filteredData = filteredData.filter(
            (tx: Transaction) =>
              tx.payment_method.toLowerCase() === selectedType.toLowerCase()
          );
        }

        setTransactions(filteredData);
        // Correctly access pagination data from backend response
        setTotalPages(data.data.totalPages);
        setTotalItems(data.data.totalItems);
      } else {
        throw new Error(data.message || 'Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError(
        error instanceof Error ? error.message : 'An unknown error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  const searchUserTransactions = async (santriId: string) => {
    try {
      setUserTransactionLoading(true);
      setUserTransactionError(null);
      setUserTransactionData(null);

      const token = getAuthToken();
      if (!token) return;

      // Corrected endpoint: /transactions/santri/{santriId}
      const response = await fetch(
        `${API_BASE_URL}/transactions/santri/${santriId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        if (response.status === 404)
          throw new Error('No transactions found for this Santri ID.');
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        if (data.data.length === 0) {
          setUserTransactionError('No transactions found for this Santri ID.');
          return;
        }
        // Backend returns only a list of transactions. We create the UserTransactionData object ourselves.
        const studentInfo = data.data[0]?.santri;
        if (!studentInfo) {
          throw new Error(
            'Could not retrieve student information from transaction data.'
          );
        }
        setUserTransactionData({
          student: studentInfo,
          transactions: data.data,
          totalItems: data.data.length,
        });
      } else {
        throw new Error(data.message || 'Failed to fetch user transactions');
      }
    } catch (error) {
      console.error('Error fetching user transactions:', error);
      setUserTransactionError(
        error instanceof Error ? error.message : 'An unknown error occurred'
      );
    } finally {
      setUserTransactionLoading(false);
    }
  };

  const handleUserSearch = () => {
    if (userSearchQuery.trim()) {
      // Assuming userSearchQuery is the Santri's numeric ID as required by the backend
      searchUserTransactions(userSearchQuery.trim());
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDate('');
    setSelectedType('all');
    setCurrentPage(1);
    fetchTransactions();
  };

  const hasActiveFilters =
    searchQuery || selectedDate || selectedType !== 'all';

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col w-full max-w-full overflow-hidden">
          <header className="border-b bg-white shadow-sm flex-shrink-0">
            <div className="flex flex-col sm:flex-row min-h-[4rem] items-start sm:items-center px-4 sm:px-8 justify-between py-4 sm:py-0 gap-4">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="md:hidden" />
                <h1 className="text-xl sm:text-2xl font-semibold">Transaction Management</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <Dialog
                  open={userSearchDialog}
                  onOpenChange={setUserSearchDialog}
                >
                  {/* <DialogTrigger asChild>
                    <Button variant="default" size="sm">
                      <User className="h-4 w-4 mr-2" />
                      View Santri Transactions
                    </Button>
                  </DialogTrigger> */}
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Santri Transaction History</DialogTitle>
                      <DialogDescription>
                        Search for a student's history by their numeric Santri
                        ID.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter Santri ID..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          onKeyPress={(e) =>
                            e.key === 'Enter' && handleUserSearch()
                          }
                        />
                        <Button
                          onClick={handleUserSearch}
                          disabled={
                            userTransactionLoading || !userSearchQuery.trim()
                          }
                        >
                          {userTransactionLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Search className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {userTransactionError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            {userTransactionError}
                          </AlertDescription>
                        </Alert>
                      )}

                      {userTransactionData && (
                        <div className="space-y-4">
                          <Card>
                            <CardHeader>
                              <CardTitle>Student Information</CardTitle>
                            </CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Name
                                </p>
                                <p className="font-medium">
                                  {userTransactionData.student.nama_santri}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  NIS (ID Santri)
                                </p>
                                <p className="font-medium">
                                  {userTransactionData.student.id_santri}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">
                                  Total Transactions
                                </p>
                                <p className="font-medium">
                                  {userTransactionData.totalItems}
                                </p>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle>Recent Transactions</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {userTransactionData.transactions.length > 0 ? (
                                <div className="space-y-2">
                                  {userTransactionData.transactions.map(
                                    (tx) => (
                                      <div
                                        key={tx.id}
                                        className="flex items-center justify-between p-3 border rounded-lg"
                                      >
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <Badge
                                              variant={
                                                tx.payment_method === 'TopUp'
                                                  ? 'default'
                                                  : 'secondary'
                                              }
                                            >
                                              {tx.payment_method}
                                            </Badge>
                                            <span className="text-sm text-muted-foreground">
                                              {formatDate(tx.createdAt)}
                                            </span>
                                          </div>
                                          <p className="text-sm mt-1 text-muted-foreground">
                                            Processed by: {tx.kasir.username}
                                          </p>
                                        </div>
                                        <p
                                          className={`font-medium ${
                                            tx.payment_method === 'TopUp'
                                              ? 'text-green-600'
                                              : 'text-red-600'
                                          }`}
                                        >
                                          {tx.payment_method === 'TopUp'
                                            ? '+'
                                            : '-'}{' '}
                                          {formatCurrency(tx.total_amount)}
                                        </p>
                                      </div>
                                    )
                                  )}
                                </div>
                              ) : (
                                <p>No transactions found.</p>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchTransactions}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto">
              <Card className="mb-6">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by Santri name or NIS..."
                        className="pl-10"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        className="pl-10"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <Filter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Select
                        value={selectedType}
                        onValueChange={setSelectedType}
                      >
                        <SelectTrigger className="pl-10">
                          <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="TopUp">Top-up</SelectItem>
                          <SelectItem value="Saldo">
                            Purchase (Saldo)
                          </SelectItem>
                          <SelectItem value="Tunai">
                            Purchase (Tunai)
                          </SelectItem>
                          <SelectItem value="QRIS">Purchase (QRIS)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {hasActiveFilters && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">
                          Active filters:
                        </span>
                        {searchQuery && (
                          <Badge variant="secondary">
                            Search: {searchQuery}
                          </Badge>
                        )}
                        {selectedDate && (
                          <Badge variant="secondary">
                            Date:{' '}
                            {new Date(selectedDate).toLocaleDateString('id-ID')}
                          </Badge>
                        )}
                        {selectedType !== 'all' && (
                          <Badge variant="secondary">
                            Type: {selectedType}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="text-xs ml-2"
                        >
                          Clear all
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>All Transactions</CardTitle>
                  <CardDescription>
                    Showing {transactions.length} of {totalItems} total
                    transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Pastikan props ini lengkap */}
                  <TransactionsTable
                    transactions={transactions}
                    loading={loading}
                    onUpdate={fetchTransactions} // <-- PROP INI PALING PENTING
                  />
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
