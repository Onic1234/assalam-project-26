'use client';

import type React from 'react';
import { useState, useEffect } from 'react';

// Import komponen UI Anda
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
import { Plus, Trash2, Edit, Search, UserPlus, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import FaceRegistrationDialog from '@/components/face-registration-dialog';

// --- BAGIAN LOGIKA API MENGGUNAKAN FETCH ---

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const KATEGORI_CUSTOMER = 'PPMI';

// Helper function untuk membuat header otentikasi
const getAuthHeaders = (includeContentType = true) => {
  const headers: HeadersInit = {
    Authorization: `Bearer ${localStorage.getItem('authToken')}`,
  };
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

// Definisikan tipe data sesuai model backend PPMI.js
// Ini adalah data mentah dari API
interface ApiPPMIUser {
  id: number;
  Username: string; // Kapital 'U'
  FaceID: string | null;
  Dibuat: string; // Nama field dari model
  Login_Terakhir?: string; // Nama field dari model
}

// Ini adalah data yang akan kita gunakan di dalam komponen (camelCase)
interface PPMIUser {
  id: number;
  username: string;
  faceId: string | null;
  createdAt: string;
  lastLogin?: string;
  faceRegistered: boolean;
}

// Tipe data untuk membuat user baru
interface NewUserInput {
  Username: string; // Harus cocok dengan backend
}

// Tipe data untuk update user
interface UpdateUserInput {
  Username: string;
}

// --- PERUBAHAN --- Tipe data untuk respons impor dari backend
interface ImportResponse {
  success: boolean;
  message: string;
  summary: {
    total_rows_in_file: number;
    success_count: number;
    failed_count: number;
    duplicate_count: number;
  };
}

// Objek yang berisi semua fungsi API menggunakan Fetch
const api = {
  async getAllUsers(): Promise<ApiPPMIUser[]> {
    const response = await fetch(
      `${API_BASE_URL}/customers/${KATEGORI_CUSTOMER}`,
      {
        method: 'GET',
        headers: getAuthHeaders(false),
      }
    );
    if (!response.ok) throw new Error('Gagal memuat data user.');
    return response.json();
  },

  async createUser(data: NewUserInput): Promise<ApiPPMIUser> {
    const response = await fetch(
      `${API_BASE_URL}/customers/${KATEGORI_CUSTOMER}`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) throw new Error('Gagal menambah user.');
    return response.json();
  },

  async updateUser(id: number, data: UpdateUserInput): Promise<ApiPPMIUser> {
    const response = await fetch(
      `${API_BASE_URL}/customers/${KATEGORI_CUSTOMER}/${id}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) throw new Error('Gagal memperbarui user.');
    return response.json();
  },

  async deleteUser(id: number): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/customers/${KATEGORI_CUSTOMER}/${id}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(false),
      }
    );
    if (!response.ok) throw new Error('Gagal menghapus user.');
  },

  async registerFace(id: number, faceDescriptor: number[]): Promise<void> {
    const payload = { faceDescriptor };
    const response = await fetch(
      `${API_BASE_URL}/customers/${KATEGORI_CUSTOMER}/${id}/faceid`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      }
    );
    if (!response.ok) throw new Error('Gagal registrasi wajah.');
  },

  // --- PERUBAHAN --- Fungsi baru untuk mengunggah file impor
  async importUsers(file: File): Promise<ImportResponse> {
    const formData = new FormData();
    formData.append('file', file); // 'file' harus cocok dengan nama field di backend

    const response = await fetch(
      `${API_BASE_URL}/import/${KATEGORI_CUSTOMER.toLowerCase()}`,
      {
        method: 'POST',
        headers: getAuthHeaders(false), // Jangan set Content-Type, browser akan menanganinya untuk FormData
        body: formData,
      }
    );

    const responseData = await response.json();
    if (!response.ok) {
      // Ambil pesan error dari body respons backend jika ada
      throw new Error(
        responseData.message || 'Gagal mengimpor data dari file.'
      );
    }
    return responseData;
  },
};

// --- AKHIR BAGIAN LOGIKA API ---

export default function YayasanManagementPage() {
  const [users, setUsers] = useState<PPMIUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PPMIUser | null>(null);
  const [formData, setFormData] = useState({
    username: '',
  });

  const [isFaceRegistrationDialogOpen, setIsFaceRegistrationDialogOpen] =
    useState(false);
  const [faceRegistrationTarget, setFaceRegistrationTarget] = useState<{
    id: number;
    name: string;
    isUpdate: boolean;
  } | null>(null);

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false); // --- PERUBAHAN --- State untuk loading import

  // Fungsi untuk memuat dan mentransformasi data dari API
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const apiUsers = await api.getAllUsers();
      // Transformasi data dari format backend ke format frontend
      const transformedUsers = apiUsers.map((user) => ({
        id: user.id,
        username: user.Username,
        faceId: user.FaceID,
        createdAt: user.Dibuat,
        lastLogin: user.Login_Terakhir,
        faceRegistered: !!user.FaceID && user.FaceID.length > 2,
      }));
      setUsers(transformedUsers);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan tidak dikenal.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filter hanya berdasarkan username
  const filteredUsers = users.filter((user) =>
    (user.username ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddUser = async () => {
    if (!formData.username) {
      toast({
        title: 'Error',
        description: 'Username harus diisi',
        variant: 'destructive',
      });
      return;
    }
    try {
      // Kirim data sesuai format backend
      await api.createUser({ Username: formData.username });
      toast({
        title: 'Berhasil',
        description: 'User baru berhasil ditambahkan',
      });
      setIsAddDialogOpen(false);
      setFormData({ username: '' });
      await fetchUsers();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Gagal menambahkan user.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser || !formData.username) {
      toast({
        title: 'Error',
        description: 'Username harus diisi',
        variant: 'destructive',
      });
      return;
    }
    try {
      // Kirim data sesuai format backend
      await api.updateUser(selectedUser.id, {
        Username: formData.username,
      });
      toast({
        title: 'Berhasil',
        description: 'Data user berhasil diperbarui',
      });
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Gagal memperbarui data user.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await api.deleteUser(userId);
      toast({ title: 'Berhasil', description: 'User berhasil dihapus' });
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Gagal menghapus user.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleFaceRegistered = async (id: number, faceDescriptor: number[]) => {
    try {
      await api.registerFace(id, faceDescriptor);
      toast({
        title: 'Berhasil',
        description: 'Data wajah berhasil disimpan.',
      });
      await fetchUsers();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Gagal menyimpan data wajah.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (user: PPMIUser) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenFaceRegistrationDialog = (user: PPMIUser) => {
    setFaceRegistrationTarget({
      id: user.id,
      name: user.username,
      isUpdate: user.faceRegistered,
    });
    setIsFaceRegistrationDialogOpen(true);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0)
      setImportFile(e.target.files[0]);
    else setImportFile(null);
  };

  // --- PERUBAHAN --- Logika untuk submit file impor ke API
  const handleImportSubmit = async () => {
    if (!importFile) {
      toast({
        title: 'Error',
        description: 'Pilih file untuk diimpor.',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    try {
      const result = await api.importUsers(importFile);
      const { summary } = result;
      toast({
        title: 'Impor Selesai',
        description: `Berhasil: ${summary.success_count}, Duplikat: ${summary.duplicate_count}, Gagal: ${summary.failed_count}.`,
      });
      setIsImportDialogOpen(false);
      setImportFile(null);
      await fetchUsers(); // Muat ulang data untuk menampilkan user baru
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat mengimpor.';
      toast({
        title: 'Error Impor',
        description: errorMessage,
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
            <h1 className="text-lg font-semibold">Kelola Yayasan PPMI</h1>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Manajemen User PPMI</CardTitle>
                  <CardDescription>
                    Kelola user yang dapat mengakses sistem
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Dialog
                    open={isImportDialogOpen}
                    onOpenChange={setIsImportDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Upload className="mr-2 h-4 w-4" />
                        Import
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Import Data User PPMI</DialogTitle>
                        {/* --- PERUBAHAN --- Deskripsi dan link download template */}
                        <DialogDescription>
                          Unggah file Excel (.xlsx) untuk menambah banyak user
                          sekaligus. Pastikan file hanya berisi satu kolom
                          dengan header 'Username'. <br />
                          <a
                            href={`${API_BASE_URL}/import/template/${KATEGORI_CUSTOMER.toLowerCase()}`}
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
                          // --- PERUBAHAN --- Batasi hanya untuk file .xlsx sesuai controller
                          accept=".xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        />
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsImportDialogOpen(false);
                            setImportFile(null);
                          }}
                        >
                          Batal
                        </Button>
                        <Button
                          onClick={handleImportSubmit}
                          // --- PERUBAHAN --- Nonaktifkan tombol saat proses impor
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
                        Tambah User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Tambah User Baru</DialogTitle>
                        <DialogDescription>
                          Tambahkan user baru yang dapat mengakses sistem
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                username: e.target.value,
                              })
                            }
                            placeholder="Masukkan username"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsAddDialogOpen(false);
                            setFormData({ username: '' });
                          }}
                        >
                          Batal
                        </Button>
                        <Button onClick={handleAddUser}>Tambah User</Button>
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
                    placeholder="Cari user..."
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
                      <TableHead>Username</TableHead>
                      <TableHead>Face Register Status</TableHead>
                      <TableHead>Dibuat</TableHead>
                      {/* <TableHead>Login Terakhir</TableHead> */}
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          Tidak ada data user
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.username}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                user.faceRegistered ? 'default' : 'secondary'
                              }
                            >
                              {user.faceRegistered
                                ? 'Sudah Tersedia'
                                : 'Belum Tersedia'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          {/* <TableCell>
                            {user.lastLogin
                              ? new Date(user.lastLogin).toLocaleDateString()
                              : '-'}
                          </TableCell> */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleOpenFaceRegistrationDialog(user)
                                }
                              >
                                <UserPlus className="h-4 w-4" />
                                <span className="sr-only">
                                  {user.faceRegistered
                                    ? 'Update Face'
                                    : 'Add Face'}
                                </span>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(user)}
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
                                      Hapus User
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Apakah Anda yakin ingin menghapus user{' '}
                                      {user.username}? Tindakan ini tidak dapat
                                      dibatalkan.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(user.id)}
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

          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>Perbarui informasi user</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-username">Username</Label>
                  <Input
                    id="edit-username"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    placeholder="Masukkan username"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedUser(null);
                  }}
                >
                  Batal
                </Button>
                <Button onClick={handleEditUser}>Simpan Perubahan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {faceRegistrationTarget && (
            <FaceRegistrationDialog
              isOpen={isFaceRegistrationDialogOpen}
              onOpenChange={setIsFaceRegistrationDialogOpen}
              onFaceRegistered={handleFaceRegistered}
              userId={faceRegistrationTarget.id}
              userName={faceRegistrationTarget.name}
              isUpdateMode={faceRegistrationTarget.isUpdate}
            />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
