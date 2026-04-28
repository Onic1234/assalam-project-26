'use client';

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
import { Plus, Trash2, Edit, Search } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { toast } from '@/hooks/use-toast';

// --- PENGATURAN API & OTENTIKASI ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Membuat header otentikasi untuk panggilan API.
 * @param includeContentType - Sertakan 'Content-Type: application/json' jika true.
 * @returns {HeadersInit} Objek headers untuk digunakan dalam fetch.
 */
// --- PERBAIKAN --- Mengubah cara pengambilan token agar sesuai dengan sistem login Anda
const getAuthHeaders = (includeContentType = true): HeadersInit => {
  const headers: HeadersInit = {};

  // Mengambil token dengan kunci 'authToken' dari localStorage (meniru halaman Yayasan)
  const token = localStorage.getItem('authToken');

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

// Interface untuk Admin/Kasir
interface AdminUser {
  id: number;
  username: string;
  role: 'admin' | 'kasir';
  balance?: {
    amount: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Interface untuk data form
interface AdminFormData {
  username: string;
  password: string;
  role: 'admin' | 'kasir';
}

// Interface untuk response API
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export default function UserManagementPage() {
  const [userList, setUserList] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState<AdminFormData>({
    username: '',
    password: '',
    role: 'kasir',
  });

  // Fetch data saat component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // --- FUNGSI PENGAMBILAN DATA (READ) ---
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/admins`, {
        method: 'GET',
        headers: getAuthHeaders(false),
      });

      if (!response.ok) {
        // Jika error 401, beri pesan yang lebih spesifik
        if (response.status === 401) {
          toast({
            title: 'Otentikasi Gagal',
            description:
              'Sesi Anda telah berakhir atau token tidak valid. Silakan login kembali.',
            variant: 'destructive',
          });
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<{ users: AdminUser[] }> = await response.json();

      if (result.success && result.data) {
        setUserList(result.data.users);
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Gagal mengambil data user',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      if (!(error instanceof Error && error.message.includes('401'))) {
        toast({
          title: 'Error',
          description:
            'Gagal mengambil data user. Periksa koneksi atau token autentikasi.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const filteredUsers = userList.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- FUNGSI TAMBAH DATA (CREATE) ---
  const handleAddUser = async () => {
    if (!formData.username || !formData.password) {
      toast({
        title: 'Error',
        description: 'Username dan password harus diisi',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      const result: ApiResponse = await response.json();

      if (result.success) {
        toast({
          title: 'Berhasil',
          description: 'User baru berhasil ditambahkan',
        });
        setIsAddDialogOpen(false);
        setFormData({ username: '', password: '', role: 'kasir' });
        fetchUsers();
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Gagal menambahkan user',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error adding user:', error);
      toast({
        title: 'Error',
        description:
          'Gagal menambahkan user. Periksa koneksi atau token autentikasi.',
        variant: 'destructive',
      });
    }
  };

  // --- FUNGSI EDIT DATA (UPDATE) ---
  const handleEditUser = async () => {
    if (!selectedUser) return;

    if (!formData.username) {
      toast({
        title: 'Error',
        description: 'Username harus diisi',
        variant: 'destructive',
      });
      return;
    }

    try {
      const updateData: any = {
        username: formData.username,
        role: formData.role,
      };

      // Hanya kirim password jika diisi
      if (formData.password) {
        updateData.password = formData.password;
      }

      const response = await fetch(
        `${API_BASE_URL}/auth/admin/${selectedUser.id}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(updateData),
        }
      );

      const result: ApiResponse = await response.json();

      if (result.success) {
        toast({
          title: 'Berhasil',
          description: 'Data user berhasil diperbarui',
        });
        setIsEditDialogOpen(false);
        setSelectedUser(null);
        setFormData({ username: '', password: '', role: 'kasir' });
        fetchUsers();
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Gagal memperbarui user',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description:
          'Gagal memperbarui user. Periksa koneksi atau token autentikasi.',
        variant: 'destructive',
      });
    }
  };

  // --- FUNGSI HAPUS DATA (DELETE) ---
  const handleDeleteUser = async (userId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/admin/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(false),
      });

      const result: ApiResponse = await response.json();

      if (result.success) {
        toast({
          title: 'Berhasil',
          description: 'User berhasil dihapus',
        });
        fetchUsers();
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Gagal menghapus user',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description:
          'Gagal menghapus user. Periksa koneksi atau token autentikasi.',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (user: AdminUser) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '', // Password kosong untuk edit
      role: user.role,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ username: '', password: '', role: 'kasir' });
    setSelectedUser(null);
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center border-b px-4 md:px-6">
          <div className="flex items-center gap-2 flex-1">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-6"
            />
            <h1 className="text-lg font-semibold">Kelola User</h1>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Manajemen User</CardTitle>
                  <CardDescription>
                    Kelola data admin dan kasir sistem
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Dialog
                    open={isAddDialogOpen}
                    onOpenChange={(open) => {
                      if (!open) {
                        resetForm();
                      }
                      setIsAddDialogOpen(open);
                    }}
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
                          Buat akun admin atau kasir baru
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
                        <div className="grid gap-2">
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                password: e.target.value,
                              })
                            }
                            placeholder="Masukkan password"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="role">Role</Label>
                          <select
                            id="role"
                            value={formData.role}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                role: e.target.value as 'admin' | 'kasir',
                              })
                            }
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            <option value="kasir">Kasir</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setIsAddDialogOpen(false)}
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
                    placeholder="Cari user berdasarkan username atau role..."
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
                      <TableHead>ID</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Dibuat</TableHead>
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
                          {searchTerm
                            ? 'Tidak ada user yang sesuai dengan pencarian'
                            : 'Tidak ada data user'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.id}</TableCell>
                          <TableCell className="font-medium">
                            {user.username}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                user.role === 'admin' ? 'default' : 'secondary'
                              }
                            >
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(user.createdAt).toLocaleDateString(
                              'id-ID'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(user)}
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
                                      Hapus User
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Apakah Anda yakin ingin menghapus user{' '}
                                      <strong>{user.username}</strong>? Tindakan
                                      ini tidak dapat dibatalkan.
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

          {/* Dialog Edit */}
          <Dialog
            open={isEditDialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                resetForm();
              }
              setIsEditDialogOpen(open);
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Perbarui informasi user yang dipilih.
                </DialogDescription>
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
                  />
                </div>
                {/* <div className="grid gap-2">
                  <Label htmlFor="edit-password">
                    Password Baru (Opsional)
                  </Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Kosongkan jika tidak ingin mengubah"
                  />
                </div> */}
                <div className="grid gap-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <select
                    id="edit-role"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as 'admin' | 'kasir',
                      })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="kasir">Kasir</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Batal
                </Button>
                <Button onClick={handleEditUser}>Simpan Perubahan</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
