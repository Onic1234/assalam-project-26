'use client';

import type React from 'react';
import { useState, useEffect } from 'react';

// (Semua import komponen UI tetap sama)
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
  CreditCard,
  Calendar,
  UserPlus,
  Upload,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import FaceRegistrationDialog from '@/components/face-registration-dialog';

// --- START: API Logic Abstraction ---

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const KATEGORI_CUSTOMER = 'Member';

// Helper untuk membuat header otentikasi
const getAuthHeaders = (includeContentType = true) => {
  const headers: HeadersInit = {
    Authorization: `Bearer ${localStorage.getItem('authToken')}`,
  };
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

// Interface untuk data mentah dari API (sesuai model Sequelize)
interface ApiMember {
  id: number;
  Nama: string;
  No_Telepon: string;
  Tanggal_Kadaluarsa: string;
  FaceID: string | null;
  Dibuat: string;
}

// Interface untuk data yang digunakan di frontend (camelCase)
interface Member {
  id: number;
  nama: string;
  noTelepon: string;
  expirationDate: string; // Format YYYY-MM-DD
  faceRegistered: boolean;
  createdAt: string; // Format dd/mm/yyyy
}

// Interface untuk payload saat membuat atau update member
interface MemberInput {
  Nama: string;
  No_Telepon: string;
  Tanggal_Kadaluarsa: string;
}

// --- PERUBAHAN --- Interface untuk respons impor
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

// Objek terpusat untuk semua fungsi API
const api = {
  async getAllMembers(): Promise<ApiMember[]> {
    const response = await fetch(
      `${API_BASE_URL}/customers/${KATEGORI_CUSTOMER}`,
      {
        method: 'GET',
        headers: getAuthHeaders(false),
      }
    );
    if (!response.ok) throw new Error('Gagal memuat data member.');
    return response.json();
  },

  async createMember(data: MemberInput): Promise<ApiMember> {
    const response = await fetch(
      `${API_BASE_URL}/customers/${KATEGORI_CUSTOMER}`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) throw new Error('Gagal menambah member baru.');
    return response.json();
  },

  async updateMember(id: number, data: MemberInput): Promise<ApiMember> {
    const response = await fetch(
      `${API_BASE_URL}/customers/${KATEGORI_CUSTOMER}/${id}`,
      {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );
    if (!response.ok) throw new Error('Gagal memperbarui data member.');
    return response.json();
  },

  async deleteMember(id: number): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/customers/${KATEGORI_CUSTOMER}/${id}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders(false),
      }
    );
    if (!response.ok) throw new Error('Gagal menghapus member.');
  },
  async registerFaceId(id: number, faceDescriptor: number[]): Promise<void> {
    const payload = { faceDescriptor };
    const response = await fetch(
      `${API_BASE_URL}/customers/${KATEGORI_CUSTOMER}/${id}/faceid`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      }
    );
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Gagal mendaftarkan Face ID.');
    }
  },

  // --- PERUBAHAN --- Fungsi baru untuk impor member
  async importMembers(file: File): Promise<ImportResponse> {
    const formData = new FormData();
    formData.append('file', file); // 'file' harus cocok dengan nama field di backend

    const response = await fetch(
      `${API_BASE_URL}/import/${KATEGORI_CUSTOMER.toLowerCase()}`,
      {
        method: 'POST',
        headers: getAuthHeaders(false), // Browser akan handle Content-Type untuk FormData
        body: formData,
      }
    );

    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(
        responseData.message || 'Gagal mengimpor data dari file.'
      );
    }
    return responseData;
  },
};

// --- END: API Logic Abstraction ---

export default function MemberManagementPage() {
  const [memberList, setMemberList] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState({
    nama: '',
    noTelepon: '',
    expirationDate: '',
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

  // --- Refactored fetchMembers ---
  const fetchMembers = async () => {
    setLoading(true);
    try {
      const apiData = await api.getAllMembers();
      // Transformasi data dari format backend ke format frontend
      const transformedMembers = apiData.map((member) => ({
        id: member.id,
        nama: member.Nama,
        noTelepon: member.No_Telepon,
        expirationDate: member.Tanggal_Kadaluarsa.split('T')[0], // Format ke YYYY-MM-DD
        faceRegistered: member.FaceID !== null && member.FaceID !== '[]',
        createdAt: new Date(member.Dibuat).toLocaleDateString('id-ID'),
      }));
      setMemberList(transformedMembers);
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
    fetchMembers();
  }, []);

  // --- CRUD Handlers ---
  const handleAddMember = async () => {
    if (!formData.nama || !formData.noTelepon || !formData.expirationDate) {
      toast({
        title: 'Error',
        description: 'Semua kolom wajib diisi.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload: MemberInput = {
        Nama: formData.nama,
        No_Telepon: formData.noTelepon,
        Tanggal_Kadaluarsa: formData.expirationDate,
      };
      await api.createMember(payload);
      toast({
        title: 'Sukses',
        description: 'Member baru berhasil ditambahkan.',
      });
      setIsAddDialogOpen(false);
      setFormData({ nama: '', noTelepon: '', expirationDate: '' });
      await fetchMembers();
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message || 'Gagal menambahkan member.',
        variant: 'destructive',
      });
    }
  };

  const handleEditMember = async () => {
    if (
      !selectedMember ||
      !formData.nama ||
      !formData.noTelepon ||
      !formData.expirationDate
    ) {
      return;
    }
    try {
      const payload: MemberInput = {
        Nama: formData.nama,
        No_Telepon: formData.noTelepon,
        Tanggal_Kadaluarsa: formData.expirationDate,
      };
      await api.updateMember(selectedMember.id, payload);
      toast({
        title: 'Sukses',
        description: 'Data member berhasil diperbarui.',
      });
      setIsEditDialogOpen(false);
      setSelectedMember(null);
      await fetchMembers();
    } catch (error) {
      toast({
        title: 'Error',
        description:
          (error as Error).message || 'Gagal memperbarui data member.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMember = async (memberId: number) => {
    try {
      await api.deleteMember(memberId);
      toast({ title: 'Sukses', description: 'Member berhasil dihapus.' });
      setMemberList((prevList) =>
        prevList.filter((member) => member.id !== memberId)
      );
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message || 'Gagal menghapus member.',
        variant: 'destructive',
      });
    }
  };

  // --- PERUBAHAN --- Handler untuk file impor
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
    } else {
      setImportFile(null);
    }
  };

  // --- PERUBAHAN --- Handler untuk submit impor
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
      const result = await api.importMembers(importFile);
      const { summary } = result;
      toast({
        title: 'Impor Selesai',
        description: `Berhasil: ${summary.success_count}, Gagal: ${summary.failed_count}, Duplikat: ${summary.duplicate_count}`,
      });
      setIsImportDialogOpen(false);
      setImportFile(null);
      await fetchMembers();
    } catch (error) {
      toast({
        title: 'Error Impor',
        description:
          (error as Error).message || 'Terjadi kesalahan saat mengimpor.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // --- Fungsi lainnya (UI handlers, stats, etc.) ---
  const filteredMembers = memberList.filter(
    (member) =>
      member.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.noTelepon.includes(searchTerm)
  );

  const isExpired = (expirationDate: string) => {
    return new Date(expirationDate) < new Date();
  };

  const openEditDialog = (member: Member) => {
    setSelectedMember(member);
    setFormData({
      nama: member.nama,
      noTelepon: member.noTelepon,
      expirationDate: member.expirationDate,
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenFaceRegistrationDialog = (member: Member) => {
    setFaceRegistrationTarget({
      id: member.id,
      name: member.nama,
      isUpdate: member.faceRegistered,
    });
    setIsFaceRegistrationDialogOpen(true);
  };

  const handleFaceRegistered = async (id: number, faceDescriptor: number[]) => {
    try {
      await api.registerFaceId(id, faceDescriptor);
      toast({
        title: 'Sukses',
        description: 'Face ID berhasil terdaftar.',
      });
      await fetchMembers();
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message || 'Gagal mendaftarkan wajah.',
        variant: 'destructive',
      });
    }
  };

  const getStatistics = () => {
    const totalMembers = memberList.length;
    const activeMembers = memberList.filter(
      (member) => !isExpired(member.expirationDate)
    ).length;
    const expiredMembers = totalMembers - activeMembers;
    const membersWithFace = memberList.filter(
      (member) => member.faceRegistered
    ).length;
    return { totalMembers, activeMembers, expiredMembers, membersWithFace };
  };
  const stats = getStatistics();

  // --- RETURN JSX ---
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
            <h1 className="text-lg font-semibold">Kelola Member</h1>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          {/* ... Statistics Cards ... */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats.totalMembers}</div>
                <p className="text-sm text-muted-foreground">Total Member</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {stats.activeMembers}
                </div>
                <p className="text-sm text-muted-foreground">Member Aktif</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">
                  {stats.expiredMembers}
                </div>
                <p className="text-sm text-muted-foreground">Member Expired</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.membersWithFace}
                </div>
                <p className="text-sm text-muted-foreground">
                  Face ID Terdaftar
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Manajemen Member</CardTitle>
                  <CardDescription>
                    Kelola data member dan keanggotaan dengan Face ID
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {/* --- PERUBAHAN --- Tombol Impor dan Dialognya */}
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
                        <DialogTitle>Import Data Member</DialogTitle>
                        <DialogDescription>
                          Unggah file Excel (.xlsx) untuk menambah banyak
                          member. Pastikan kolom sesuai template. <br />
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
                          disabled={!importFile || isImporting}
                        >
                          {isImporting ? 'Mengimpor...' : 'Unggah & Import'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>

                  {/* Tombol Tambah Member */}
                  <Dialog
                    open={isAddDialogOpen}
                    onOpenChange={setIsAddDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Tambah Member Baru</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="nama">Nama Lengkap</Label>
                          <Input
                            id="nama"
                            value={formData.nama}
                            onChange={(e) =>
                              setFormData({ ...formData, nama: e.target.value })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="noTelepon">No. Telepon</Label>
                          <Input
                            id="noTelepon"
                            value={formData.noTelepon}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                noTelepon: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="expirationDate">
                            Tanggal Kadaluarsa
                          </Label>
                          <Input
                            id="expirationDate"
                            type="date"
                            value={formData.expirationDate}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                expirationDate: e.target.value,
                              })
                            }
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
                        <Button onClick={handleAddMember}>Tambah Member</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* ... Search Bar dan Tabel ... */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari member..."
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
                      <TableHead>No. Telepon</TableHead>
                      <TableHead>Kadaluarsa</TableHead>
                      <TableHead>Face ID</TableHead>
                      <TableHead>Dibuat</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : filteredMembers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Tidak ada data member
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>{member.nama}</TableCell>
                          <TableCell>{member.noTelepon}</TableCell>
                          <TableCell>
                            {new Date(member.expirationDate).toLocaleDateString(
                              'id-ID'
                            )}
                            {isExpired(member.expirationDate) && (
                              <Badge
                                variant="destructive"
                                className="ml-2 text-xs"
                              >
                                Expired
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                member.faceRegistered ? 'default' : 'secondary'
                              }
                            >
                              {member.faceRegistered ? 'Terdaftar' : 'Belum'}
                            </Badge>
                          </TableCell>
                          <TableCell>{member.createdAt}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Action Buttons */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleOpenFaceRegistrationDialog(member)
                                }
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(member)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Hapus Member
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Yakin ingin menghapus member {member.nama}
                                      ?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleDeleteMember(member.id)
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

          {/* ... Edit Dialog dan Face Registration Dialog ... */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Member</DialogTitle>
                <DialogDescription>Perbarui informasi member</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-nama">Nama Lengkap</Label>
                  <Input
                    id="edit-nama"
                    value={formData.nama}
                    onChange={(e) =>
                      setFormData({ ...formData, nama: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-noTelepon">No. Telepon</Label>
                  <Input
                    id="edit-noTelepon"
                    value={formData.noTelepon}
                    onChange={(e) =>
                      setFormData({ ...formData, noTelepon: e.target.value })
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-expirationDate">
                    Tanggal Kadaluarsa
                  </Label>
                  <Input
                    id="edit-expirationDate"
                    type="date"
                    value={formData.expirationDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expirationDate: e.target.value,
                      })
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
                <Button onClick={handleEditMember}>Simpan Perubahan</Button>
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
              userCategory="member"
            />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
