'use client';

import type React from 'react';
import { useState } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Wallet,
  CreditCard,
  CheckCircle,
  XCircle,
  Loader2,
  UserSearch,
  UserCircle,
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Interface terpadu untuk data santri atau member
interface Account {
  id: number; // ID Primary Key
  name: string; // Nama Lengkap
  uniqueId: string; // ID Santri atau ID Member
  balance: { amount: number }; // Saldo saat ini
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface TopupResponseData {
  owner_id: number;
  owner_type: 'santri' | 'member';
  name: string;
  amount_topped_up: number;
  new_balance: number;
}

export default function TopUpPage() {
  const [topupType, setTopupType] = useState<'santri' | 'member'>('santri');
  const [nameInput, setNameInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Hasil pencarian dan akun yang dipilih
  const [searchResults, setSearchResults] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const [selectedAmount, setSelectedAmount] = useState<string>('');
  const [customAmount, setCustomAmount] = useState('');

  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showFailureAlert, setShowFailureAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const quickAmounts = [
    { value: '10000', label: 'Rp 10.000' },
    { value: '20000', label: 'Rp 20.000' },
    { value: '50000', label: 'Rp 50.000' },
    { value: '100000', label: 'Rp 100.000' },
    { value: '200000', label: 'Rp 200.000' },
    { value: '500000', label: 'Rp 500.000' },
  ];

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('authToken')}`,
  });

  const handleSearchByName = async () => {
    if (!nameInput.trim() || nameInput.trim().length < 2) {
      setSearchError(`Masukkan nama atau ID ${topupType === 'santri' ? 'santri' : 'member'} (minimal 2 karakter).`);
      return;
    }
    setIsSearching(true);
    setSearchError('');
    setSelectedAccount(null);
    setSearchResults([]);

    try {
      const endpoint = topupType === 'santri'
        ? `/santri/search?q=${encodeURIComponent(nameInput)}`
        : `/customers/member/search?q=${encodeURIComponent(nameInput)}`;

      const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || `Gagal mencari data ${topupType}.`);
      }

      if (result.data.length === 0) {
        setSearchError(
          `Akun dengan nama atau ID "${nameInput}" tidak ditemukan.`
        );
      } else {
        const mappedResults: Account[] = result.data.map((item: any) => ({
          id: item.id,
          name: topupType === 'santri' ? item.nama_santri : item.Nama,
          uniqueId: topupType === 'santri' ? item.id_santri : (item.id_member || '-'),
          balance: item.balance || { amount: 0 },
        }));
        setSearchResults(mappedResults);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Error tidak diketahui.';
      setSearchError(errorMessage);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectAccount = (account: Account) => {
    setSelectedAccount(account);
    setSearchResults([]);
    setNameInput(account.name);
    setSearchError('');
  };

  const processTopUp = async (
    id: number,
    amount: number
  ): Promise<ApiResponse<TopupResponseData>> => {
    const payload = topupType === 'santri'
      ? { santriId: id, amount }
      : { memberId: id, amount };

    const response = await fetch(`${API_BASE_URL}/topup`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result.message || `Request gagal`);
    }
    return result;
  };

  const handleTopUp = async () => {
    const amount = selectedAmount || customAmount;
    if (!selectedAccount || !amount) return;

    const numericAmount = Number.parseInt(amount);
    if (numericAmount <= 0) {
      setAlertMessage('Masukkan jumlah yang valid.');
      setShowFailureAlert(true);
      return;
    }

    setIsProcessing(true);
    try {
      const result = await processTopUp(selectedAccount.id, numericAmount);

      const updatedAccount = {
        ...selectedAccount,
        balance: { amount: result.data.new_balance },
      };
      setSelectedAccount(updatedAccount);
      setAlertMessage(
        `Top-up untuk ${
          result.data.name
        } berhasil! Saldo baru: Rp ${result.data.new_balance.toLocaleString()}`
      );
      setShowSuccessAlert(true);
      setSelectedAmount('');
      setCustomAmount('');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Terjadi error.';
      setAlertMessage(`Top-up gagal. ${errorMessage}`);
      setShowFailureAlert(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedAccount(null);
    setSearchResults([]);
    setNameInput('');
    setSelectedAmount('');
    setCustomAmount('');
    setSearchError('');
  };

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
            <h1 className="text-lg font-semibold">Top Up Saldo</h1>
          </div>
          {selectedAccount && (
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1">
                <UserCircle className="h-6 w-6" />
                <span className="text-sm font-medium">
                  {selectedAccount.name}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Cari {topupType === 'santri' ? 'Santri' : 'Member'} Lain
              </Button>
            </div>
          )}
        </header>

        <main className="flex-1 p-4 md:p-6">
          {!selectedAccount ? (
            <div className="flex flex-col items-center justify-start pt-16 gap-6">
              {/* Toggle switch antara Santri dan Member */}
              <div className="flex bg-muted p-1 rounded-lg w-full max-w-lg">
                <button
                  onClick={() => { setTopupType('santri'); handleReset(); }}
                  className={`flex-1 text-center py-2 text-sm font-medium rounded-md transition-all ${
                    topupType === 'santri'
                      ? 'bg-white shadow text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Top-Up Santri
                </button>
                <button
                  onClick={() => { setTopupType('member'); handleReset(); }}
                  className={`flex-1 text-center py-2 text-sm font-medium rounded-md transition-all ${
                    topupType === 'member'
                      ? 'bg-white shadow text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Top-Up Member
                </button>
              </div>

              <Card className="w-full max-w-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <UserSearch /> Cari Akun {topupType === 'santri' ? 'Santri' : 'Member'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Masukkan nama atau ID {topupType === 'santri' ? 'santri' : 'member'} untuk menemukan akun.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder={`Masukkan Nama atau ID ${topupType === 'santri' ? 'Santri' : 'Member'}`}
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === 'Enter' && handleSearchByName()
                      }
                      disabled={isSearching}
                    />
                    <Button
                      onClick={handleSearchByName}
                      disabled={isSearching || nameInput.length < 2}
                    >
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Cari'
                      )}
                    </Button>
                  </div>
                  {searchError && (
                    <p className="mt-2 text-sm text-red-600">{searchError}</p>
                  )}
                </CardContent>
              </Card>

              {searchResults.length > 0 && (
                <Card className="w-full max-w-lg">
                  <CardHeader>
                    <CardTitle>Hasil Pencarian</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nama</TableHead>
                          <TableHead>ID</TableHead>
                          <TableHead>Saldo</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {searchResults.map((account) => (
                          <TableRow key={account.id}>
                            <TableCell className="font-medium">
                              {account.name}
                            </TableCell>
                            <TableCell>{account.uniqueId}</TableCell>
                            <TableCell>
                              {`Rp ${
                                account.balance?.amount.toLocaleString() ?? '0'
                              }`}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSelectAccount(account)}
                              >
                                Pilih
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle>Profil {topupType === 'santri' ? 'Santri' : 'Member'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center text-center mb-6">
                      <Avatar className="h-24 w-24 mb-4">
                        <AvatarImage
                          src="/placeholder.svg"
                          alt={selectedAccount.name}
                        />
                        <AvatarFallback className="text-2xl">
                          {selectedAccount.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="text-xl font-medium">
                        {selectedAccount.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        ID: {selectedAccount.uniqueId}
                      </p>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="text-sm text-muted-foreground">
                        Saldo Saat Ini
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Wallet className="h-6 w-6" />
                        <span className="text-3xl font-bold">
                          Rp {selectedAccount.balance.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>Isi Saldo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div>
                        <Label className="font-medium text-base">
                          Jumlah Kustom
                        </Label>
                        <Input
                          type="number"
                          placeholder="e.g., 15000"
                          className="h-12 text-lg mt-2"
                          value={customAmount}
                          onChange={(e) => {
                            setCustomAmount(e.target.value);
                            setSelectedAmount('');
                          }}
                          disabled={isProcessing}
                        />
                      </div>
                      <div>
                        <Label className="font-medium text-base">
                          Pilihan Cepat
                        </Label>
                        <RadioGroup
                          value={selectedAmount}
                          onValueChange={(v) => {
                            setSelectedAmount(v);
                            setCustomAmount('');
                          }}
                          className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2"
                          disabled={isProcessing}
                        >
                          {quickAmounts.map((amount) => (
                            <Label
                              key={amount.value}
                              htmlFor={`amount-${amount.value}`}
                              className={`flex items-center gap-3 cursor-pointer rounded-md border p-3 text-center hover:bg-accent ${
                                isProcessing
                                  ? 'opacity-50 cursor-not-allowed'
                                  : ''
                              }`}
                            >
                              <RadioGroupItem
                                value={amount.value}
                                id={`amount-${amount.value}`}
                              />{' '}
                              {amount.label}
                            </Label>
                          ))}
                        </RadioGroup>
                      </div>
                      <Button
                        className="w-full h-12 text-base"
                        size="lg"
                        onClick={handleTopUp}
                        disabled={
                          (!selectedAmount && !customAmount) || isProcessing
                        }
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />{' '}
                            Memproses...
                          </>
                        ) : (
                          <>
                            <CreditCard className="mr-2 h-5 w-5" /> Proses
                            Top-up
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </SidebarInset>

      <AlertDialog open={showSuccessAlert} onOpenChange={setShowSuccessAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <AlertDialogTitle>Berhasil!</AlertDialogTitle>
            </div>
            <AlertDialogDescription>{alertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowSuccessAlert(false)}>
              Lanjutkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showFailureAlert} onOpenChange={setShowFailureAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-600" />
              <AlertDialogTitle>Error</AlertDialogTitle>
            </div>
            <AlertDialogDescription>{alertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowFailureAlert(false)}>
              Coba Lagi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
