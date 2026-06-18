'use client';

import type React from 'react';

import { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Trash2,
  Edit,
  Search,
  GraduationCap,
  UserPlus,
  Upload,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import FaceRegistrationDialog from '@/components/face-registration-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/utils/formatCurrency';

// --- Interface & Konfigurasi ---
interface Santri {
  id: number;
  id_santri: string;
  nama_santri: string;
  jenis_kelamin: 'L' | 'P';
  kelas: string;
  unit: string;
  FaceID: string | null;
  createdAt: string;
  balance: {
    // Diubah menjadi objek
    amount: number;
  } | null; // Bisa null jika santri belum punya saldo
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const KATEGORI_CUSTOMER = 'santri'; // --- PERUBAHAN --- Kategori untuk endpoint import

// --- Helper untuk Header Otentikasi ---
const getAuthHeaders = (includeContentType = true): HeadersInit => {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  if (!token) {
    // Sebaiknya ditangani dengan lebih baik, misal redirect ke login
    console.error('Token otentikasi tidak ditemukan.');
    return {};
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
  };

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

export default function SantriManagementPage() {
  const [santriList, setSantriList] = useState<Santri[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('All');

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null);

  const [formData, setFormData] = useState({
    id_santri: '',
    nama_santri: '',
    jenis_kelamin: 'L' as 'L' | 'P',
    kelas: '',
    unit: 'SMP',
  });

  const [isFaceRegistrationDialogOpen, setIsFaceRegistrationDialogOpen] =
    useState(false);
  const [faceRegistrationTarget, setFaceRegistrationTarget] = useState<{
    id: number;
    name: string;
    isUpdate: boolean;
  } | null>(null);

  // --- PERUBAHAN --- State untuk fungsionalitas Impor
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // State untuk bulk delete
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleSelectSantri = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredSantri.map((s) => s.id);
    const allAreSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id));

    if (allAreSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => {
        const newSelection = [...prev];
        allFilteredIds.forEach((id) => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
    }
  };

  const handleBulkDeleteSantri = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    let successCount = 0;
    let failCount = 0;

    for (const id of selectedIds) {
      try {
        const response = await fetch(`${API_BASE_URL}/customers/santri/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(false),
        });
        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        failCount++;
      }
    }

    await fetchSantri();
    setSelectedIds([]);
    setIsBulkDeleting(false);

    if (failCount === 0) {
      toast({
        title: 'Berhasil',
        description: `${successCount} santri berhasil dihapus`,
      });
    } else {
      toast({
        title: 'Selesai dengan error',
        description: `${successCount} santri berhasil dihapus, ${failCount} gagal`,
        variant: 'destructive',
      });
    }
  };

  // Fungsi untuk mengambil data santri
  const fetchSantri = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/customers/santri`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Gagal mengambil data dari server');
      }
      const data = await response.json();
      // Tidak perlu lagi memanipulasi data, karena backend sudah memberikan data yang benar
      setSantriList(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal mengambil data santri dari server.',
        variant: 'destructive',
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchSantri();
  }, []);

  const filteredSantri = santriList.filter(
    (santri) =>
      (santri.nama_santri.toLowerCase().includes(searchTerm.toLowerCase()) ||
        santri.id_santri.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedUnitFilter === 'All' || santri.unit === selectedUnitFilter)
  );

  // --- CRUD Functions (Add, Edit, Delete) ---
  const handleAddSantri = async () => {
    if (!formData.id_santri || !formData.nama_santri || !formData.kelas) {
      toast({
        title: 'Error',
        description: 'ID Santri, Nama, dan Kelas harus diisi',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/customers/santri`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Gagal menambahkan santri');
      }

      await fetchSantri();
      setIsAddDialogOpen(false);
      setFormData({
        id_santri: '',
        nama_santri: '',
        jenis_kelamin: 'L',
        kelas: '',
        unit: 'SMP',
      });
      toast({
        title: 'Berhasil',
        description: 'Santri baru berhasil ditambahkan',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal menambahkan santri.',
        variant: 'destructive',
      });
    }
  };

  const handleEditSantri = async () => {
    if (!selectedSantri) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/customers/santri/${selectedSantri.id}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        throw new Error('Gagal memperbarui santri');
      }
      await fetchSantri();
      setIsEditDialogOpen(false);
      setSelectedSantri(null);
      toast({
        title: 'Berhasil',
        description: 'Data santri berhasil diperbarui',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal memperbarui data santri.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSantri = async (santriId: number) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/customers/santri/${santriId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(false),
        }
      );
      if (!response.ok) {
        throw new Error('Gagal menghapus santri');
      }
      await fetchSantri();
      toast({
        title: 'Berhasil',
        description: 'Santri berhasil dihapus',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal menghapus santri.',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (santri: Santri) => {
    setSelectedSantri(santri);
    setFormData({
      id_santri: santri.id_santri,
      nama_santri: santri.nama_santri,
      jenis_kelamin: santri.jenis_kelamin,
      kelas: santri.kelas,
      unit: santri.unit,
    });
    setIsEditDialogOpen(true);
  };

  // --- Face Registration Functions ---
  const handleOpenFaceRegistrationDialog = (santri: Santri) => {
    setFaceRegistrationTarget({
      id: santri.id,
      name: santri.nama_santri,
      isUpdate: !!santri.FaceID,
    });
    setIsFaceRegistrationDialogOpen(true);
  };

  const handleFaceRegistered = async (
    userId: number,
    faceDescriptor: number[]
  ) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/customers/santri/${userId}/faceid`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ faceDescriptor }),
        }
      );

      if (!response.ok) {
        throw new Error('Gagal mendaftarkan Face ID');
      }
      await fetchSantri();
      setIsFaceRegistrationDialogOpen(false);
      toast({
        title: 'Berhasil',
        description: 'Face ID berhasil didaftarkan.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal mendaftarkan Face ID.',
        variant: 'destructive',
      });
    }
  };

  // --- PERUBAHAN --- Fungsi untuk menangani file import
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
    } else {
      setImportFile(null);
    }
  };

  // --- PERUBAHAN --- Fungsi untuk mengirim file import ke API
  const handleImportSubmit = async () => {
    if (!importFile) {
      toast({
        title: 'File Tidak Ditemukan',
        description: 'Silakan pilih file Excel untuk diimpor.',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const response = await fetch(
        `${API_BASE_URL}/import/${KATEGORI_CUSTOMER}`,
        {
          method: 'POST',
          headers: getAuthHeaders(false), // Browser akan set Content-Type untuk FormData
          body: formData,
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Terjadi kesalahan saat mengimpor.');
      }

      const { summary } = result;
      toast({
        title: 'Impor Selesai',
        description: `Berhasil: ${summary.success_count}, Duplikat: ${summary.duplicate_count}, Gagal: ${summary.failed_count}.`,
      });

      setIsImportDialogOpen(false);
      setImportFile(null);
      await fetchSantri(); // Muat ulang data untuk menampilkan data baru
    } catch (error) {
      toast({
        title: 'Error Impor',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
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
            <h1 className="text-lg font-semibold">Kelola Santri</h1>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Manajemen Santri</CardTitle>
                  <CardDescription>
                    Kelola data santri dan pesantren dengan Face ID
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {/* --- PERUBAHAN --- Tombol dan Dialog Impor ditambahkan di sini */}
                  <Dialog
                    open={isImportDialogOpen}
                    onOpenChange={(open) => {
                      if (!open) setImportFile(null);
                      setIsImportDialogOpen(open);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Upload className="mr-2 h-4 w-4" />
                        Import Santri
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Import Data Santri</DialogTitle>
                        <DialogDescription>
                          Unggah file Excel (.xlsx) untuk menambah banyak data
                          santri. Pastikan kolom sesuai template.
                          <br />
                          <a
                            href={`${API_BASE_URL}/import/template/${KATEGORI_CUSTOMER}`}
                            className="text-sm text-blue-600 hover:underline"
                            download
                          >
                            Unduh file template di sini.
                          </a>
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <Input
                          id="import-file"
                          type="file"
                          onChange={handleImportFileChange}
                          accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsImportDialogOpen(false)}
                        >
                          Batal
                        </Button>
                        <Button
                          onClick={handleImportSubmit}
                          disabled={!importFile || isImporting}
                        >
                          {isImporting ? 'Mengimpor...' : 'Unggah & Import'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={isAddDialogOpen}
                    onOpenChange={setIsAddDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah Santri
                      </Button>
                    </DialogTrigger>
                    {/* ... Dialog Tambah Santri ... */}
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Tambah Santri Baru</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="id_santri">ID Santri</Label>
                          <Input
                            id="id_santri"
                            value={formData.id_santri}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                id_santri: e.target.value,
                              })
                            }
                            placeholder="Masukkan ID unik santri"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="nama_santri">Nama Lengkap</Label>
                          <Input
                            id="nama_santri"
                            value={formData.nama_santri}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                nama_santri: e.target.value,
                              })
                            }
                            placeholder="Masukkan nama lengkap"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="kelas">Kelas</Label>
                          <Input
                            id="kelas"
                            value={formData.kelas}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                kelas: e.target.value,
                              })
                            }
                            placeholder="Contoh: 10 IPA 1"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="unit">Unit Pendidikan</Label>
                          <Select
                            value={formData.unit}
                            onValueChange={(value: any) =>
                              setFormData({ ...formData, unit: value })
                            }
                          >
                            <SelectTrigger id="unit">
                              <SelectValue placeholder="Pilih Unit" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MTs">MTs</SelectItem>
                              <SelectItem value="SMA">SMA</SelectItem>
                              <SelectItem value="MA">MA</SelectItem>
                              <SelectItem value="SMK">SMK</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsAddDialogOpen(false)}
                        >
                          Batal
                        </Button>
                        <Button onClick={handleAddSantri}>Tambah Santri</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {selectedIds.length > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isBulkDeleting}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Hapus Terpilih ({selectedIds.length})
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Santri Terpilih</AlertDialogTitle>
                          <AlertDialogDescription>
                            Apakah Anda yakin ingin menghapus {selectedIds.length} santri yang terpilih? Tindakan ini tidak dapat dibatalkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleBulkDeleteSantri}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Hapus Semua
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* ... Filter dan Tabel ... */}
              <div className="mb-4 flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari santri..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="w-48">
                  <Select
                    value={selectedUnitFilter}
                    onValueChange={(value: string) =>
                      setSelectedUnitFilter(value)
                    }
                  >
                    <SelectTrigger id="category-filter">
                      <SelectValue placeholder="Filter Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">Semua Unit</SelectItem>
                      <SelectItem value="MTs  ">MTs</SelectItem>
                      <SelectItem value="SMA">SMA</SelectItem>
                      <SelectItem value="MA">MA</SelectItem>
                      <SelectItem value="SMK">SMK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                          checked={
                            filteredSantri.length > 0 &&
                            filteredSantri.every((s) => selectedIds.includes(s.id))
                          }
                          onChange={handleSelectAllFiltered}
                        />
                      </TableHead>
                      <TableHead>ID Santri</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Face ID Status</TableHead>
                      <TableHead>Dibuat</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredSantri.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8">
                          Tidak ada data santri
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSantri.map((santri) => (
                        <TableRow key={santri.id} className={selectedIds.includes(santri.id) ? "bg-muted/50" : ""}>
                          <TableCell>
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                              checked={selectedIds.includes(santri.id)}
                              onChange={() => handleSelectSantri(santri.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {santri.id_santri}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <GraduationCap className="h-4 w-4" />
                              {santri.nama_santri}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{santri.unit}</Badge>
                          </TableCell>
                          <TableCell>{santri.kelas}</TableCell>
                          <TableCell>
                            {formatCurrency(
                              santri.balance ? santri.balance.amount : 0
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                !!santri.FaceID ? 'default' : 'secondary'
                              }
                            >
                              {!!santri.FaceID
                                ? 'Sudah Terdaftar'
                                : 'Belum Terdaftar'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(santri.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleOpenFaceRegistrationDialog(santri)
                                }
                              >
                                <UserPlus className="h-4 w-4" />
                                <span className="sr-only">
                                  {!!santri.FaceID
                                    ? 'Update Face ID'
                                    : 'Daftar Face ID'}
                                </span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(santri)}
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Hapus Santri
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Apakah Anda yakin ingin menghapus santri{' '}
                                      {santri.nama_santri}? Tindakan ini tidak
                                      dapat dibatalkan.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleDeleteSantri(santri.id)
                                      }
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Hapus
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
          {faceRegistrationTarget && (
            <FaceRegistrationDialog
              isOpen={isFaceRegistrationDialogOpen}
              onOpenChange={setIsFaceRegistrationDialogOpen}
              onFaceRegistered={handleFaceRegistered}
              userId={faceRegistrationTarget.id}
              userName={faceRegistrationTarget.name}
              isUpdateMode={faceRegistrationTarget.isUpdate}
              userCategory="santri"
            />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
