'use client';

import type React from 'react';
import { useState, useEffect, useCallback } from 'react';
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
  User,
  UserPlus,
  Upload, // --- PERUBAHAN --- Import ikon Upload
} from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { toast } from '@/hooks/use-toast';
import FaceRegistrationDialog from '@/components/face-registration-dialog';

// --- PENGATURAN API & OTENTIKASI ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const KATEGORI_CUSTOMER = 'staff'; // --- PERUBAHAN --- Kategori spesifik untuk endpoint

/**
 * Membuat header otentikasi untuk panggilan API.
 * @param includeContentType - Sertakan 'Content-Type: application/json' jika true.
 * @returns {HeadersInit} Objek headers untuk digunakan dalam fetch.
 */
const getAuthHeaders = (includeContentType = true): HeadersInit => {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
  };

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

// Interface disesuaikan dengan field dari model Sequelize di backend
interface Staff {
  id: number;
  Nama: string;
  Gender: 'L' | 'P';
  NIK: string;
  No_WhatsApp: string;
  FaceID?: string | null; // FaceID opsional
  Dibuat: string;
  faceRegistered?: boolean;
}

// Interface untuk data form
interface StaffFormData {
  Nama: string;
  Gender: 'L' | 'P';
  NIK: string;
  No_WhatsApp: string;
}

export default function StaffManagementPage() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState<StaffFormData>({
    Nama: '',
    Gender: 'L',
    NIK: '',
    No_WhatsApp: '',
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

  // --- FUNGSI PENGAMBILAN DATA (READ) ---
  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/customers/Staff`, {
        method: 'GET',
        headers: getAuthHeaders(false),
      });

      if (!response.ok) throw new Error('Gagal mengambil data staff');

      const data: Staff[] = await response.json();
      setStaffList(
        data.map((staff) => ({ ...staff, faceRegistered: !!staff.FaceID }))
      );
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const filteredStaff = staffList.filter(
    (staff) =>
      staff.Nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (staff.NIK &&
        staff.NIK.toLowerCase().includes(searchTerm.toLowerCase())) ||
      staff.No_WhatsApp.includes(searchTerm)
  );

  // --- FUNGSI TAMBAH DATA (CREATE) ---
  const handleAddStaff = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/Staff`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menambahkan staff');
      }

      toast({
        title: 'Berhasil',
        description: 'Staff baru berhasil ditambahkan',
      });
      setIsAddDialogOpen(false);
      fetchStaff();
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  // --- FUNGSI EDIT DATA (UPDATE) ---
  const handleEditStaff = async () => {
    if (!selectedStaff) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/customers/Staff/${selectedStaff.id}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal memperbarui staff');
      }
      toast({
        title: 'Berhasil',
        description: 'Data staff berhasil diperbarui',
      });
      setIsEditDialogOpen(false);
      fetchStaff();
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  // --- FUNGSI HAPUS DATA (DELETE) ---
  const handleDeleteStaff = async (staffId: number) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/customers/Staff/${staffId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(false),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menghapus staff');
      }

      toast({ title: 'Berhasil', description: 'Staff berhasil dihapus' });
      fetchStaff();
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (staff: Staff) => {
    setSelectedStaff(staff);
    setFormData({
      Nama: staff.Nama,
      Gender: staff.Gender,
      NIK: staff.NIK,
      No_WhatsApp: staff.No_WhatsApp,
    });
    setIsEditDialogOpen(true);
  };

  // --- PERUBAHAN --- Fungsi untuk menangani perubahan file pada input impor
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
    } else {
      setImportFile(null);
    }
  };

  // --- PERUBAHAN --- Fungsi untuk mengirim file impor ke backend
  const handleImportStaff = async () => {
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
          headers: getAuthHeaders(false), // browser akan set Content-Type untuk FormData
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
      fetchStaff(); // Muat ulang data untuk menampilkan staff baru
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
            <h1 className="text-lg font-semibold">Kelola Staff</h1>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Manajemen Staff</CardTitle>
                  <CardDescription>
                    Kelola data staff dan karyawan dengan Face ID
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {/* --- PERUBAHAN --- Tombol dan Dialog Impor ditambahkan di sini */}
                  <Dialog
                    open={isImportDialogOpen}
                    onOpenChange={(open) => {
                      if (!open) setImportFile(null); // Reset file saat dialog ditutup
                      setIsImportDialogOpen(open);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Import Data Staff</DialogTitle>
                        <DialogDescription>
                          Unggah file Excel (.xlsx) untuk menambah banyak staff.
                          Pastikan kolom sesuai template.
                          <br />
                          <a
                            href={`${API_BASE_URL}/import/template/${KATEGORI_CUSTOMER}`}
                            className="text-sm text-blue-600 hover:underline"
                            download
                          >
                            Unduh template di sini.
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
                          onClick={handleImportStaff}
                          disabled={!importFile || isImporting}
                        >
                          {isImporting ? 'Mengimpor...' : 'Unggah & Import'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  <Dialog
                    open={isAddDialogOpen}
                    onOpenChange={(open) => {
                      if (!open) {
                        setFormData({
                          Nama: '',
                          Gender: 'L',
                          NIK: '',
                          No_WhatsApp: '',
                        });
                      }
                      setIsAddDialogOpen(open);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah Staff
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      {/* Konten Dialog Tambah Staff Tetap Sama */}
                      <DialogHeader>
                        <DialogTitle>Tambah Staff Baru</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="nama">Nama Lengkap</Label>
                          <Input
                            id="nama"
                            value={formData.Nama}
                            onChange={(e) =>
                              setFormData({ ...formData, Nama: e.target.value })
                            }
                            placeholder="Masukkan nama lengkap"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="gender">Jenis Kelamin</Label>
                          <select
                            id="gender"
                            value={formData.Gender}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                Gender: e.target.value as 'L' | 'P',
                              })
                            }
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="L">Laki-laki</option>
                            <option value="P">Perempuan</option>
                          </select>
                        </div>
                        {/* <div className="grid gap-2">
                          <Label htmlFor="nik">Nomor Induk Karyawan</Label>
                          <Input
                            id="nik"
                            value={formData.NIK}
                            onChange={(e) =>
                              setFormData({ ...formData, NIK: e.target.value })
                            }
                            placeholder="Masukkan NIK"
                          />
                        </div> */}
                        <div className="grid gap-2">
                          <Label htmlFor="whatsapp">No. WhatsApp</Label>
                          <Input
                            id="whatsapp"
                            value={formData.No_WhatsApp}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                No_WhatsApp: e.target.value,
                              })
                            }
                            placeholder="Masukkan nomor WhatsApp"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsAddDialogOpen(false)}
                        >
                          Batal
                        </Button>
                        <Button onClick={handleAddStaff}>Tambah Staff</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari staff berdasarkan Nama, atau No. WhatsApp..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama</TableHead>
                      <TableHead>Jenis Kelamin</TableHead>
                      {/* <TableHead>NIK</TableHead> */}
                      <TableHead>No. WhatsApp</TableHead>
                      {/* <TableHead>Face ID Status</TableHead> */}
                      <TableHead>Dibuat</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* ... (Konten Tabel Tetap Sama) ... */}
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredStaff.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Tidak ada data staff
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredStaff.map((staff) => (
                        <TableRow key={staff.id}>
                          <TableCell className="font-medium">
                            {staff.Nama}
                          </TableCell>
                          <TableCell>
                            {staff.Gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                          </TableCell>
                          {/* <TableCell>{staff.NIK || '-'}</TableCell> */}
                          <TableCell>{staff.No_WhatsApp}</TableCell>
                          {/* <TableCell>
                            <Badge
                              variant={
                                staff.faceRegistered ? 'default' : 'secondary'
                              }
                            >
                              {staff.faceRegistered
                                ? 'Sudah Terdaftar'
                                : 'Belum Terdaftar'}
                            </Badge>
                          </TableCell> */}
                          <TableCell>
                            {new Date(staff.Dibuat).toLocaleDateString('id-ID')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(staff)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Hapus Staff
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Apakah Anda yakin ingin menghapus staff{' '}
                                      {staff.Nama}?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleDeleteStaff(staff.id)
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

          {/* Dialog Edit (Tetap sama) */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Staff</DialogTitle>
                <DialogDescription>
                  Perbarui informasi staff yang dipilih.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Form Edit */}
                <div className="grid gap-2">
                  <Label htmlFor="edit-nama">Nama Lengkap</Label>
                  <Input
                    id="edit-nama"
                    value={formData.Nama}
                    onChange={(e) =>
                      setFormData({ ...formData, Nama: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-gender">Jenis Kelamin</Label>
                  <select
                    id="edit-gender"
                    value={formData.Gender}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        Gender: e.target.value as 'L' | 'P',
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                {/* <div className="grid gap-2">
                  <Label htmlFor="edit-nik">Nomor Induk Karyawan</Label>
                  <Input
                    id="edit-nik"
                    value={formData.NIK}
                    onChange={(e) =>
                      setFormData({ ...formData, NIK: e.target.value })
                    }
                  />
                </div> */}
                <div className="grid gap-2">
                  <Label htmlFor="edit-whatsapp">No. WhatsApp</Label>
                  <Input
                    id="edit-whatsapp"
                    value={formData.No_WhatsApp}
                    onChange={(e) =>
                      setFormData({ ...formData, No_WhatsApp: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button onClick={handleEditStaff}>Simpan Perubahan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog Registrasi Wajah (Tetap sama, tidak ada Face ID di Staff berdasarkan file Anda) */}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
