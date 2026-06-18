'use client';

import { useState, useEffect, useRef } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Grid,
  List,
  Plus,
  Search,
  Trash2,
  Edit,
  Loader2,
  AlertCircle,
  Archive,
  Upload,
  Image as ImageIcon,
  Calendar,
  MapPin,
  CheckCircle2,
  Phone,
  User as UserIcon,
  HelpCircle,
  X,
  Camera,
  Clock,
  FileSpreadsheet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface LostItem {
  id: number;
  nama_barang: string;
  deskripsi?: string;
  tanggal_ditemukan: string;
  lokasi_ditemukan?: string;
  status: 'Lost' | 'Claimed';
  foto_barang?: string;
  kode_barang?: string;
  foto_ktp?: string;
  petugas_input?: string;
  petugas_klaim?: string;
  nama_pemilik?: string;
  nomor_telepon_pemilik?: string;
  tanggal_diambil?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const getTodayDateString = () => {
  const date = new Date();
  const tzoffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzoffset).toISOString().split('T')[0];
};

const getCurrentHourString = () => String(new Date().getHours()).padStart(2, '0');
const getCurrentMinuteString = () => String(new Date().getMinutes()).padStart(2, '0');

const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const minuteOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

const formatDateTime = (dateStr: string | undefined) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return dateStr;
  }
};

const parseDateAndTime = (isoStr: string | undefined) => {
  if (!isoStr) return { date: '', hour: '00', minute: '00' };
  try {
    const dateObj = new Date(isoStr);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hour = String(dateObj.getHours()).padStart(2, '0');
    const minute = String(dateObj.getMinutes()).padStart(2, '0');
    return {
      date: `${year}-${month}-${day}`,
      hour,
      minute
    };
  } catch {
    return { date: '', hour: '00', minute: '00' };
  }
};

export default function LostFoundPage() {
  const [items, setItems] = useState<LostItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Lost' | 'Claimed'>('all');

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isClaimOpen, setIsClaimOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState(false);

  // Camera states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraMode, setCameraMode] = useState<'add' | 'edit' | 'claim' | 'edit_ktp'>('add');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Selected item states
  const [selectedItem, setSelectedItem] = useState<LostItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<LostItem | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string>('');

  // Form states
  const [addForm, setAddForm] = useState({
    nama_barang: '',
    deskripsi: '',
    tanggal_ditemukan: getTodayDateString(),
    jam_ditemukan: getCurrentHourString(),
    menit_ditemukan: getCurrentMinuteString(),
    lokasi_ditemukan: '',
    foto_barang: '',
    kode_barang: '',
  });

  const [editForm, setEditForm] = useState({
    nama_barang: '',
    deskripsi: '',
    tanggal_ditemukan: '',
    jam_ditemukan: '00',
    menit_ditemukan: '00',
    lokasi_ditemukan: '',
    status: 'Lost' as 'Lost' | 'Claimed',
    foto_barang: '',
    kode_barang: '',
    foto_ktp: '',
    nama_pemilik: '',
    nomor_telepon_pemilik: '',
    tanggal_diambil: '',
    jam_diambil: '00',
    menit_diambil: '00',
  });

  const [claimForm, setClaimForm] = useState({
    nama_pemilik: '',
    nomor_telepon_pemilik: '',
    tanggal_diambil: getTodayDateString(),
    jam_diambil: getCurrentHourString(),
    menit_diambil: getCurrentMinuteString(),
    foto_ktp: '',
  });

  // Headers config
  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const handleApiError = (err: any, defaultMessage: string) => {
    console.error('API Error:', err);
    const errorMessage = err.message || (err.error ? `${err.error}: ${err.message}` : defaultMessage);
    setError(errorMessage);
    toast.error(errorMessage);
  };

  const fetchItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/lost-items`, {
        headers: getAuthHeaders(),
      });
      const data: ApiResponse<LostItem[]> = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Gagal mengambil data barang temuan');
      }
      setItems(data.data || []);
    } catch (err) {
      handleApiError(err, 'Gagal mengambil data barang temuan');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Camera functions
  const startCameraStream = async (mode: 'add' | 'edit' | 'claim' | 'edit_ktp') => {
    setCameraMode(mode);
    setCameraError(null);
    setIsCameraActive(true);

    // Wait for dialog rendering to resolve ref
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // back camera by default on mobile
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
        }
      } catch (err: any) {
        console.error('Camera access error:', err);
        setCameraError('Tidak dapat mengakses kamera. Pastikan browser Anda memiliki izin.');
      }
    }, 150);
  };

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.85); // 85% compression

        if (cameraMode === 'add') {
          setAddForm({ ...addForm, foto_barang: base64 });
        } else if (cameraMode === 'edit') {
          setEditForm({ ...editForm, foto_barang: base64 });
        } else if (cameraMode === 'claim') {
          setClaimForm({ ...claimForm, foto_ktp: base64 });
        } else if (cameraMode === 'edit_ktp') {
          setEditForm({ ...editForm, foto_ktp: base64 });
        }
      }
      stopCameraStream();
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup camera stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleAddItem = async () => {
    if (!addForm.nama_barang.trim()) {
      toast.error('Nama barang wajib diisi');
      return;
    }
    if (!addForm.tanggal_ditemukan) {
      toast.error('Tanggal ditemukan wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nama_barang: addForm.nama_barang,
        deskripsi: addForm.deskripsi,
        tanggal_ditemukan: `${addForm.tanggal_ditemukan}T${addForm.jam_ditemukan}:${addForm.menit_ditemukan}:00`,
        lokasi_ditemukan: addForm.lokasi_ditemukan,
        foto_barang: addForm.foto_barang,
        kode_barang: addForm.kode_barang,
      };

      const response = await fetch(`${API_BASE_URL}/lost-items`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw data;

      toast.success('Barang temuan berhasil dicatat');
      setIsAddOpen(false);
      setAddForm({
        nama_barang: '',
        deskripsi: '',
        tanggal_ditemukan: getTodayDateString(),
        jam_ditemukan: getCurrentHourString(),
        menit_ditemukan: getCurrentMinuteString(),
        lokasi_ditemukan: '',
        foto_barang: '',
        kode_barang: '',
      });
      fetchItems();
    } catch (err) {
      handleApiError(err, 'Gagal mencatat barang temuan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditItem = async () => {
    if (!selectedItem) return;
    if (!editForm.nama_barang.trim()) {
      toast.error('Nama barang wajib diisi');
      return;
    }
    if (!editForm.tanggal_ditemukan) {
      toast.error('Tanggal ditemukan wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        nama_barang: editForm.nama_barang,
        deskripsi: editForm.deskripsi,
        tanggal_ditemukan: `${editForm.tanggal_ditemukan}T${editForm.jam_ditemukan}:${editForm.menit_ditemukan}:00`,
        lokasi_ditemukan: editForm.lokasi_ditemukan,
        status: editForm.status,
        foto_barang: editForm.foto_barang,
        kode_barang: editForm.kode_barang,
        foto_ktp: editForm.status === 'Claimed' ? editForm.foto_ktp : null,
        nama_pemilik: editForm.nama_pemilik,
        nomor_telepon_pemilik: editForm.nomor_telepon_pemilik,
        tanggal_diambil: editForm.status === 'Claimed' && editForm.tanggal_diambil
          ? `${editForm.tanggal_diambil}T${editForm.jam_diambil}:${editForm.menit_diambil}:00`
          : null,
      };

      const response = await fetch(`${API_BASE_URL}/lost-items/${selectedItem.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw data;

      toast.success('Data barang temuan berhasil diperbarui');
      setIsEditOpen(false);
      fetchItems();
    } catch (err) {
      handleApiError(err, 'Gagal memperbarui data barang temuan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimItem = async () => {
    if (!selectedItem) return;
    if (!claimForm.nama_pemilik.trim()) {
      toast.error('Nama penerima wajib diisi');
      return;
    }
    if (!claimForm.nomor_telepon_pemilik.trim()) {
      toast.error('Nomor telepon penerima wajib diisi');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        status: 'Claimed',
        nama_pemilik: claimForm.nama_pemilik,
        nomor_telepon_pemilik: claimForm.nomor_telepon_pemilik,
        tanggal_diambil: `${claimForm.tanggal_diambil}T${claimForm.jam_diambil}:${claimForm.menit_diambil}:00`,
        foto_ktp: claimForm.foto_ktp,
      };

      const response = await fetch(`${API_BASE_URL}/lost-items/${selectedItem.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw data;

      toast.success('Barang berhasil diklaim');
      setIsClaimOpen(false);
      setClaimForm({
        nama_pemilik: '',
        nomor_telepon_pemilik: '',
        tanggal_diambil: getTodayDateString(),
        jam_diambil: getCurrentHourString(),
        menit_diambil: getCurrentMinuteString(),
        foto_ktp: '',
      });
      fetchItems();
    } catch (err) {
      handleApiError(err, 'Gagal memproses klaim barang');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/lost-items/${itemToDelete.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw data;

      toast.success('Barang temuan berhasil dihapus');
      setIsDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchItems();
    } catch (err) {
      handleApiError(err, 'Gagal menghapus barang temuan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportExcel = () => {
    if (filteredItems.length === 0) {
      toast.error('Tidak ada data yang dapat diekspor');
      return;
    }

    const headers = [
      'No',
      'Kode Barang',
      'Nama Barang',
      'Deskripsi',
      'Tanggal Ditemukan',
      'Lokasi Ditemukan',
      'Status',
      'Petugas Pencatat',
      'Nama Penerima',
      'No Telepon Penerima',
      'Tanggal Diambil',
      'Petugas Penyerah'
    ];

    const rows = filteredItems.map((item, index) => [
      String(index + 1),
      item.kode_barang || '',
      item.nama_barang,
      item.deskripsi || '',
      formatDateTime(item.tanggal_ditemukan),
      item.lokasi_ditemukan || '',
      item.status === 'Lost' ? 'Belum Diambil' : 'Sudah Diambil',
      item.petugas_input || '',
      item.nama_pemilik || '',
      item.nomor_telepon_pemilik || '',
      item.status === 'Claimed' ? formatDateTime(item.tanggal_diambil) : '',
      item.status === 'Claimed' ? (item.petugas_klaim || '') : ''
    ]);

    // Format CSV using semicolon separation
    // Excel supports "sep=;" at the top of the file to auto-detect semicolon delimiter
    const csvContent = 
      '\uFEFF' + // UTF-8 BOM
      'sep=;\r\n' + 
      headers.join(';') + '\r\n' + 
      rows.map(row => 
        row.map(val => {
          // Escape quotes and wrap with double quotes
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(';')
      ).join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    // Generate clean filename
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `laporan_barang_temuan_${dateStr}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Laporan barang temuan berhasil diekspor');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, mode: 'add' | 'edit' | 'claim' | 'edit_ktp') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (mode === 'add') {
          setAddForm({ ...addForm, foto_barang: base64 });
        } else if (mode === 'edit') {
          setEditForm({ ...editForm, foto_barang: base64 });
        } else if (mode === 'claim') {
          setClaimForm({ ...claimForm, foto_ktp: base64 });
        } else if (mode === 'edit_ktp') {
          setEditForm({ ...editForm, foto_ktp: base64 });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const openEditDialog = (item: LostItem) => {
    setSelectedItem(item);
    const found = parseDateAndTime(item.tanggal_ditemukan);
    const claimed = parseDateAndTime(item.tanggal_diambil);
    setEditForm({
      nama_barang: item.nama_barang,
      deskripsi: item.deskripsi || '',
      tanggal_ditemukan: found.date,
      jam_ditemukan: found.hour,
      menit_ditemukan: found.minute,
      lokasi_ditemukan: item.lokasi_ditemukan || '',
      status: item.status,
      foto_barang: item.foto_barang || '',
      kode_barang: item.kode_barang || '',
      foto_ktp: item.foto_ktp || '',
      nama_pemilik: item.nama_pemilik || '',
      nomor_telepon_pemilik: item.nomor_telepon_pemilik || '',
      tanggal_diambil: claimed.date || getTodayDateString(),
      jam_diambil: claimed.hour || '00',
      menit_diambil: claimed.minute || '00',
    });
    setIsEditOpen(true);
  };

  const openClaimDialog = (item: LostItem) => {
    setSelectedItem(item);
    setIsClaimOpen(true);
  };

  const openPhotoPreview = (url: string) => {
    setPreviewPhotoUrl(url);
    setIsPhotoPreviewOpen(true);
  };

  // Filtered and Searched Items
  const filteredItems = items.filter((item) => {
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      item.nama_barang.toLowerCase().includes(searchLower) ||
      (item.deskripsi && item.deskripsi.toLowerCase().includes(searchLower)) ||
      (item.lokasi_ditemukan && item.lokasi_ditemukan.toLowerCase().includes(searchLower));
    return matchesStatus && matchesSearch;
  });

  // Calculate Metrics
  const totalCount = items.length;
  const lostCount = items.filter((i) => i.status === 'Lost').length;
  const claimedCount = items.filter((i) => i.status === 'Claimed').length;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center border-b px-4 md:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-6" />
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Archive className="h-5 w-5 text-red-500" />
              Dashboard Lost & Found
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative w-full md:w-64 lg:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Cari barang temuan..."
                className="w-full rounded-lg bg-background pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 space-y-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-md">
              <CardHeader className="pb-2">
                <CardDescription className="text-slate-400">Total Barang Temuan</CardDescription>
                <CardTitle className="text-3xl font-bold flex items-center justify-between">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : totalCount}
                  <Archive className="h-7 w-7 text-slate-400 opacity-60" />
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-to-br from-red-950 to-red-900 text-white border-none shadow-md">
              <CardHeader className="pb-2">
                <CardDescription className="text-red-300">Belum Diambil (Lost)</CardDescription>
                <CardTitle className="text-3xl font-bold flex items-center justify-between">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-red-400" /> : lostCount}
                  <HelpCircle className="h-7 w-7 text-red-400 opacity-60" />
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-gradient-to-br from-green-950 to-green-900 text-white border-none shadow-md">
              <CardHeader className="pb-2">
                <CardDescription className="text-green-300">Sudah Diambil (Claimed)</CardDescription>
                <CardTitle className="text-3xl font-bold flex items-center justify-between">
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-green-400" /> : claimedCount}
                  <CheckCircle2 className="h-7 w-7 text-green-400 opacity-60" />
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button onClick={() => setIsAddOpen(true)} className="h-9">
                <Plus className="mr-2 h-4 w-4" />
                Catat Barang Baru
              </Button>
              <Button
                onClick={handleExportExcel}
                variant="outline"
                className="h-9 border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/20"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>

            <div className="flex items-center gap-3">
              {/* Filter Tabs */}
              <div className="flex border rounded-lg overflow-hidden bg-background">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-slate-100 dark:bg-slate-800 text-foreground'
                      : 'text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setStatusFilter('Lost')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === 'Lost'
                      ? 'bg-red-500/10 text-red-500'
                      : 'text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  Belum Diambil
                </button>
                <button
                  onClick={() => setStatusFilter('Claimed')}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    statusFilter === 'Claimed'
                      ? 'bg-green-500/10 text-green-500'
                      : 'text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  Sudah Diambil
                </button>
              </div>

              {/* View mode toggle */}
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(val) => val && setViewMode(val as 'grid' | 'list')}
              >
                <ToggleGroupItem value="grid">
                  <Grid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {/* Table/Grid Card */}
          <Card>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12">
                  <Archive className="mx-auto h-12 w-12 text-muted-foreground opacity-60" />
                  <p className="mt-4 text-muted-foreground">Tidak ada data barang temuan.</p>
                </div>
              ) : viewMode === 'list' ? (
                /* List View */
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Barang</TableHead>
                        <TableHead>Tanggal Temu</TableHead>
                        <TableHead>Lokasi</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Penerima</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div
                                onClick={() => item.foto_barang && openPhotoPreview(item.foto_barang)}
                                className={`w-10 h-10 rounded border overflow-hidden bg-slate-50 flex items-center justify-center flex-shrink-0 ${
                                  item.foto_barang ? 'cursor-pointer hover:opacity-80' : ''
                                }`}
                              >
                                {item.foto_barang ? (
                                  <img
                                    src={item.foto_barang}
                                    alt={item.nama_barang}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Archive className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold">{item.nama_barang}</p>
                                  {item.kode_barang && (
                                    <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-mono border-red-200 text-red-600 bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:bg-red-950/20">
                                      {item.kode_barang}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {item.deskripsi || 'Tidak ada deskripsi'}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="flex items-center gap-1.5 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {formatDateTime(item.tanggal_ditemukan)}
                              </span>
                              {item.petugas_input && (
                                <span className="text-[10px] text-muted-foreground italic pl-[22px]">
                                  Oleh: {item.petugas_input}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1.5 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              {item.lokasi_ditemukan || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.status === 'Lost' ? 'destructive' : 'secondary'}>
                              {item.status === 'Lost' ? 'Belum Diambil' : 'Sudah Diambil'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.status === 'Claimed' ? (
                              <div className="text-xs space-y-0.5">
                                <p className="font-medium flex items-center gap-1">
                                  <UserIcon className="h-3 w-3 text-muted-foreground" />
                                  {item.nama_pemilik}
                                </p>
                                <p className="text-muted-foreground flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-muted-foreground" />
                                  {item.nomor_telepon_pemilik}
                                </p>
                                {item.petugas_klaim && (
                                  <p className="text-muted-foreground text-[10px] italic flex items-center gap-1">
                                    Penyerah: {item.petugas_klaim}
                                  </p>
                                )}
                                {item.foto_ktp ? (
                                  <div
                                    onClick={() => item.foto_ktp && openPhotoPreview(item.foto_ktp)}
                                    className="inline-flex items-center gap-1 text-[10px] text-green-600 hover:text-green-700 cursor-pointer mt-1 font-medium bg-green-500/10 px-1 py-0.5 rounded border border-green-500/20"
                                  >
                                    <ImageIcon className="h-2.5 w-2.5" />
                                    Lihat KTP
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-red-500 italic block mt-0.5">Tanpa KTP</span>
                                )}
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1.5">
                              {item.status === 'Lost' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openClaimDialog(item)}
                                  className="h-8 bg-green-500/10 hover:bg-green-500/20 text-green-600 hover:text-green-700 border-none"
                                >
                                  Klaim
                                </Button>
                              )}
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} className="h-8 w-8">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setItemToDelete(item);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="h-8 w-8 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                /* Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredItems.map((item) => (
                    <Card key={item.id} className="overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
                      {/* Image Preview */}
                      <div
                        onClick={() => item.foto_barang && openPhotoPreview(item.foto_barang)}
                        className={`relative aspect-video w-full bg-slate-50 dark:bg-slate-900 border-b overflow-hidden flex items-center justify-center flex-shrink-0 ${
                          item.foto_barang ? 'cursor-pointer hover:opacity-95' : ''
                        }`}
                      >
                        {item.foto_barang ? (
                          <img
                            src={item.foto_barang}
                            alt={item.nama_barang}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Archive className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                        )}
                        <Badge
                          variant={item.status === 'Lost' ? 'destructive' : 'secondary'}
                          className="absolute top-2.5 right-2.5 shadow-sm"
                        >
                          {item.status === 'Lost' ? 'Belum Diambil' : 'Sudah Diambil'}
                        </Badge>
                      </div>

                      {/* Header */}
                      <CardHeader className="p-4 pb-2 flex-grow space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-base font-bold line-clamp-1">{item.nama_barang}</CardTitle>
                          {item.kode_barang && (
                            <Badge variant="outline" className="px-1.5 py-0 text-[9px] font-mono border-red-200 text-red-600 bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:bg-red-950/20 flex-shrink-0">
                              {item.kode_barang}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.deskripsi || 'Tidak ada deskripsi.'}
                        </p>
                      </CardHeader>

                      {/* Details Content */}
                      <CardContent className="p-4 pt-0 text-xs space-y-2 border-t mt-auto">
                        <div className="flex items-center gap-1.5 text-muted-foreground mt-2">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Ditemukan: {formatDateTime(item.tanggal_ditemukan)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>Lokasi: {item.lokasi_ditemukan || '-'}</span>
                        </div>
                        {item.petugas_input && (
                          <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] italic mt-0.5">
                            <span>Dicatat oleh: {item.petugas_input}</span>
                          </div>
                        )}

                        {item.status === 'Claimed' && (
                          <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-md space-y-1 mt-2 border border-dashed">
                            <p className="font-semibold text-[10px] text-slate-400 uppercase tracking-wide">
                              Detail Pengambilan
                            </p>
                            <p className="flex items-center gap-1 text-[11px] font-medium text-foreground">
                              <UserIcon className="h-3 w-3 text-muted-foreground" />
                              {item.nama_pemilik}
                            </p>
                            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {item.nomor_telepon_pemilik}
                            </p>
                            <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              Tgl Ambil: {formatDateTime(item.tanggal_diambil)}
                            </p>
                            {item.petugas_klaim && (
                              <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <UserIcon className="h-3 w-3 text-muted-foreground" />
                                Penyerah: {item.petugas_klaim}
                              </p>
                            )}
                            {item.foto_ktp ? (
                              <div className="flex items-center gap-2 mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800">
                                <span className="text-[10px] text-muted-foreground">Scan KTP:</span>
                                <div
                                  onClick={() => item.foto_ktp && openPhotoPreview(item.foto_ktp)}
                                  className="w-12 h-8 rounded border border-slate-200 overflow-hidden cursor-pointer hover:opacity-80 flex-shrink-0 bg-white dark:bg-slate-950 flex items-center justify-center"
                                >
                                  <img src={item.foto_ktp} alt="KTP" className="w-full h-full object-cover" />
                                </div>
                              </div>
                            ) : (
                              <p className="text-[10px] text-red-500 italic mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800">
                                Tanpa Scan KTP
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>

                      {/* Footer Actions */}
                      <CardFooter className="p-4 pt-0 flex justify-between border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        {item.status === 'Lost' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openClaimDialog(item)}
                            className="h-8 bg-green-500/10 hover:bg-green-500/20 text-green-600 hover:text-green-700 border-none"
                          >
                            Klaim Barang
                          </Button>
                        ) : (
                          <div className="w-1" />
                        )}
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} className="h-8 w-8">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setItemToDelete(item);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        {/* --- DIALOGS --- */}

        {/* 1. Dialog Tambah Barang */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Catat Barang Temuan Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="addName">Nama Barang <span className="text-red-500">*</span></Label>
                <Input
                  id="addName"
                  placeholder="Contoh: Kacamata Renang Hitam"
                  value={addForm.nama_barang}
                  onChange={(e) => setAddForm({ ...addForm, nama_barang: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="addCode">Label / Kode Barang</Label>
                <Input
                  id="addCode"
                  placeholder="Contoh: kc1 (Kosongkan untuk auto-generate)"
                  value={addForm.kode_barang}
                  onChange={(e) => setAddForm({ ...addForm, kode_barang: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="addDate">Tanggal Ditemukan <span className="text-red-500">*</span></Label>
                  <Input
                    id="addDate"
                    type="date"
                    value={addForm.tanggal_ditemukan}
                    onChange={(e) => setAddForm({ ...addForm, tanggal_ditemukan: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label>Waktu Ditemukan <span className="text-red-500">*</span></Label>
                  <div className="flex items-center justify-center gap-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 shadow-sm focus-within:ring-1 focus-within:ring-ring">
                    <Clock className="h-4 w-4 text-muted-foreground mr-1 flex-shrink-0" />
                    <select
                      value={addForm.jam_ditemukan}
                      onChange={(e) => setAddForm({ ...addForm, jam_ditemukan: e.target.value })}
                      className="bg-transparent text-sm outline-none border-none text-center appearance-none cursor-pointer w-8 focus:ring-0 p-0 m-0 [background-image:none] text-foreground font-medium"
                    >
                      {hourOptions.map(h => <option key={h} value={h} className="bg-background text-foreground">{h}</option>)}
                    </select>
                    <span className="text-muted-foreground font-semibold px-0.5">:</span>
                    <select
                      value={addForm.menit_ditemukan}
                      onChange={(e) => setAddForm({ ...addForm, menit_ditemukan: e.target.value })}
                      className="bg-transparent text-sm outline-none border-none text-center appearance-none cursor-pointer w-8 focus:ring-0 p-0 m-0 [background-image:none] text-foreground font-medium"
                    >
                      {minuteOptions.map(m => <option key={m} value={m} className="bg-background text-foreground">{m}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="addLocation">Lokasi Ditemukan</Label>
                  <Input
                    id="addLocation"
                    placeholder="Contoh: Pinggir Kolam Anak"
                    value={addForm.lokasi_ditemukan}
                    onChange={(e) => setAddForm({ ...addForm, lokasi_ditemukan: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="addDesc">Deskripsi Barang</Label>
                <Textarea
                  id="addDesc"
                  placeholder="Keterangan kondisi barang, merek, warna, dll."
                  value={addForm.deskripsi}
                  onChange={(e) => setAddForm({ ...addForm, deskripsi: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Foto Barang Upload/Camera */}
              <div className="space-y-2">
                <Label>Foto Barang</Label>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-md border-2 border-dashed flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 flex-shrink-0">
                    {addForm.foto_barang ? (
                      <img
                        src={addForm.foto_barang}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      id="addLostImageInput"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'add')}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('addLostImageInput')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Pilih File
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => startCameraStream('add')}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Ambil Foto
                      </Button>
                      {addForm.foto_barang && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setAddForm({ ...addForm, foto_barang: '' })}
                        >
                          Hapus
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Pilih berkas gambar atau ambil foto menggunakan kamera.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleAddItem} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 2. Dialog Edit Barang */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Barang Temuan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="editName">Nama Barang <span className="text-red-500">*</span></Label>
                <Input
                  id="editName"
                  value={editForm.nama_barang}
                  onChange={(e) => setEditForm({ ...editForm, nama_barang: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editCode">Label / Kode Barang</Label>
                <Input
                  id="editCode"
                  placeholder="Contoh: kc1"
                  value={editForm.kode_barang}
                  onChange={(e) => setEditForm({ ...editForm, kode_barang: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="editDate">Tanggal Ditemukan <span className="text-red-500">*</span></Label>
                  <Input
                    id="editDate"
                    type="date"
                    value={editForm.tanggal_ditemukan}
                    onChange={(e) => setEditForm({ ...editForm, tanggal_ditemukan: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label>Waktu Ditemukan <span className="text-red-500">*</span></Label>
                  <div className="flex items-center justify-center gap-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 shadow-sm focus-within:ring-1 focus-within:ring-ring">
                    <Clock className="h-4 w-4 text-muted-foreground mr-1 flex-shrink-0" />
                    <select
                      value={editForm.jam_ditemukan}
                      onChange={(e) => setEditForm({ ...editForm, jam_ditemukan: e.target.value })}
                      className="bg-transparent text-sm outline-none border-none text-center appearance-none cursor-pointer w-8 focus:ring-0 p-0 m-0 [background-image:none] text-foreground font-medium"
                    >
                      {hourOptions.map(h => <option key={h} value={h} className="bg-background text-foreground">{h}</option>)}
                    </select>
                    <span className="text-muted-foreground font-semibold px-0.5">:</span>
                    <select
                      value={editForm.menit_ditemukan}
                      onChange={(e) => setEditForm({ ...editForm, menit_ditemukan: e.target.value })}
                      className="bg-transparent text-sm outline-none border-none text-center appearance-none cursor-pointer w-8 focus:ring-0 p-0 m-0 [background-image:none] text-foreground font-medium"
                    >
                      {minuteOptions.map(m => <option key={m} value={m} className="bg-background text-foreground">{m}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="editLocation">Lokasi Ditemukan</Label>
                  <Input
                    id="editLocation"
                    value={editForm.lokasi_ditemukan}
                    onChange={(e) => setEditForm({ ...editForm, lokasi_ditemukan: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDesc">Deskripsi Barang</Label>
                <Textarea
                  id="editDesc"
                  value={editForm.deskripsi}
                  onChange={(e) => setEditForm({ ...editForm, deskripsi: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editStatus">Status</Label>
                <div className="flex border rounded-lg overflow-hidden w-fit bg-background">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, status: 'Lost' })}
                    className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
                      editForm.status === 'Lost'
                        ? 'bg-red-500 text-white'
                        : 'text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    Belum Diambil
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, status: 'Claimed' })}
                    className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
                      editForm.status === 'Claimed'
                        ? 'bg-green-500 text-white'
                        : 'text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    Sudah Diambil
                  </button>
                </div>
              </div>

              {editForm.status === 'Claimed' && (
                <div className="p-3 border rounded-lg bg-slate-50 dark:bg-slate-900 space-y-3">
                  <p className="font-semibold text-xs text-slate-400 uppercase tracking-wide">
                    Informasi Pengambilan
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="editOwner">Nama Penerima <span className="text-red-500">*</span></Label>
                    <Input
                      id="editOwner"
                      placeholder="Nama lengkap penerima"
                      value={editForm.nama_pemilik}
                      onChange={(e) => setEditForm({ ...editForm, nama_pemilik: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="editPhone">Nomor Telepon <span className="text-red-500">*</span></Label>
                      <Input
                        id="editPhone"
                        placeholder="Contoh: 08123456789"
                        value={editForm.nomor_telepon_pemilik}
                        onChange={(e) => setEditForm({ ...editForm, nomor_telepon_pemilik: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 col-span-1">
                      <Label htmlFor="editClaimDate">Tanggal Diambil <span className="text-red-500">*</span></Label>
                      <Input
                        id="editClaimDate"
                        type="date"
                        value={editForm.tanggal_diambil}
                        onChange={(e) => setEditForm({ ...editForm, tanggal_diambil: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2 col-span-1">
                      <Label>Waktu Diambil <span className="text-red-500">*</span></Label>
                      <div className="flex items-center justify-center gap-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 shadow-sm focus-within:ring-1 focus-within:ring-ring">
                        <Clock className="h-4 w-4 text-muted-foreground mr-1 flex-shrink-0" />
                        <select
                          value={editForm.jam_diambil}
                          onChange={(e) => setEditForm({ ...editForm, jam_diambil: e.target.value })}
                          className="bg-transparent text-sm outline-none border-none text-center appearance-none cursor-pointer w-8 focus:ring-0 p-0 m-0 [background-image:none] text-foreground font-medium"
                        >
                          {hourOptions.map(h => <option key={h} value={h} className="bg-background text-foreground">{h}</option>)}
                        </select>
                        <span className="text-muted-foreground font-semibold px-0.5">:</span>
                        <select
                          value={editForm.menit_diambil}
                          onChange={(e) => setEditForm({ ...editForm, menit_diambil: e.target.value })}
                          className="bg-transparent text-sm outline-none border-none text-center appearance-none cursor-pointer w-8 focus:ring-0 p-0 m-0 [background-image:none] text-foreground font-medium"
                        >
                          {minuteOptions.map(m => <option key={m} value={m} className="bg-background text-foreground">{m}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Foto KTP Edit */}
                  <div className="space-y-2 col-span-2 border-t pt-3 mt-3">
                    <Label>Foto / Scan KTP Penerima</Label>
                    <div className="flex items-center gap-4">
                      <div className="relative w-24 h-16 rounded-md border-2 border-dashed flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 flex-shrink-0">
                        {editForm.foto_ktp ? (
                          <img
                            src={editForm.foto_ktp}
                            alt="Preview KTP"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          id="editKtpImageInput"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, 'edit_ktp')}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('editKtpImageInput')?.click()}
                          >
                            <Upload className="h-3.5 w-3.5 mr-1.5" />
                            Pilih File
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => startCameraStream('edit_ktp')}
                          >
                            <Camera className="h-3.5 w-3.5 mr-1.5" />
                            Ambil Foto
                          </Button>
                          {editForm.foto_ktp && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => setEditForm({ ...editForm, foto_ktp: '' })}
                            >
                              Hapus
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Foto Barang Edit */}
              <div className="space-y-2">
                <Label>Foto Barang</Label>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-md border-2 border-dashed flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 flex-shrink-0">
                    {editForm.foto_barang ? (
                      <img
                        src={editForm.foto_barang}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      id="editLostImageInput"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'edit')}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('editLostImageInput')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Ubah File
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => startCameraStream('edit')}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Ambil Foto
                      </Button>
                      {editForm.foto_barang && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setEditForm({ ...editForm, foto_barang: '' })}
                        >
                          Hapus
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleEditItem} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 3. Dialog Klaim Barang */}
        <Dialog open={isClaimOpen} onOpenChange={setIsClaimOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Klaim Barang Temuan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 text-xs">
                <p className="font-semibold mb-1">Konfirmasi Klaim Barang:</p>
                <p className="font-bold text-sm text-foreground mb-2">{selectedItem?.nama_barang}</p>
                Silakan isi data penerima yang mengambil barang untuk menyelesaikan klaim ini.
              </div>

              <div className="space-y-2">
                <Label htmlFor="claimOwner">Nama Penerima <span className="text-red-500">*</span></Label>
                <Input
                  id="claimOwner"
                  placeholder="Nama lengkap penerima"
                  value={claimForm.nama_pemilik}
                  onChange={(e) => setClaimForm({ ...claimForm, nama_pemilik: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="claimPhone">Nomor Telepon Penerima <span className="text-red-500">*</span></Label>
                  <Input
                    id="claimPhone"
                    placeholder="Contoh: 08123456789"
                    value={claimForm.nomor_telepon_pemilik}
                    onChange={(e) => setClaimForm({ ...claimForm, nomor_telepon_pemilik: e.target.value })}
                  />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="claimDate">Tanggal Diambil <span className="text-red-500">*</span></Label>
                  <Input
                    id="claimDate"
                    type="date"
                    value={claimForm.tanggal_diambil}
                    onChange={(e) => setClaimForm({ ...claimForm, tanggal_diambil: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2 col-span-1">
                  <Label>Waktu Diambil <span className="text-red-500">*</span></Label>
                  <div className="flex items-center justify-center gap-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 shadow-sm focus-within:ring-1 focus-within:ring-ring">
                    <Clock className="h-4 w-4 text-muted-foreground mr-1 flex-shrink-0" />
                    <select
                      value={claimForm.jam_diambil}
                      onChange={(e) => setClaimForm({ ...claimForm, jam_diambil: e.target.value })}
                      className="bg-transparent text-sm outline-none border-none text-center appearance-none cursor-pointer w-8 focus:ring-0 p-0 m-0 [background-image:none] text-foreground font-medium"
                    >
                      {hourOptions.map(h => <option key={h} value={h} className="bg-background text-foreground">{h}</option>)}
                    </select>
                    <span className="text-muted-foreground font-semibold px-0.5">:</span>
                    <select
                      value={claimForm.menit_diambil}
                      onChange={(e) => setClaimForm({ ...claimForm, menit_diambil: e.target.value })}
                      className="bg-transparent text-sm outline-none border-none text-center appearance-none cursor-pointer w-8 focus:ring-0 p-0 m-0 [background-image:none] text-foreground font-medium"
                    >
                      {minuteOptions.map(m => <option key={m} value={m} className="bg-background text-foreground">{m}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Foto KTP Upload/Camera */}
              <div className="space-y-2 border-t pt-3 mt-3">
                <Label>Foto / Scan KTP Penerima</Label>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-16 rounded-md border-2 border-dashed flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 flex-shrink-0">
                    {claimForm.foto_ktp ? (
                      <img
                        src={claimForm.foto_ktp}
                        alt="Preview KTP"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      id="claimKtpImageInput"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, 'claim')}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('claimKtpImageInput')?.click()}
                      >
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        Pilih File
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => startCameraStream('claim')}
                      >
                        <Camera className="h-3.5 w-3.5 mr-1.5" />
                        Ambil Foto
                      </Button>
                      {claimForm.foto_ktp && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setClaimForm({ ...claimForm, foto_ktp: '' })}
                        >
                          Hapus
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsClaimOpen(false)}>
                Batal
              </Button>
              <Button onClick={handleClaimItem} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Konfirmasi Klaim
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 4. Dialog Hapus Barang */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Yakin mau hapus barang ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Tindakan ini tidak dapat dibatalkan. Data barang temuan <strong>{itemToDelete?.nama_barang}</strong> akan dihapus permanen dari sistem.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setItemToDelete(null)}>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteItem} disabled={isSubmitting} className="bg-destructive hover:bg-destructive text-destructive-foreground">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* 5. Modal Zoom Foto */}
        <Dialog open={isPhotoPreviewOpen} onOpenChange={setIsPhotoPreviewOpen}>
          <DialogContent className="max-w-2xl p-1 bg-transparent border-none">
            <div className="relative w-full aspect-auto flex items-center justify-center">
              <Button
                variant="outline"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white border-none z-50"
                onClick={() => setIsPhotoPreviewOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              <img
                src={previewPhotoUrl}
                alt="Zoomed preview"
                className="max-h-[80vh] w-auto max-w-full rounded-md object-contain shadow-2xl bg-slate-900"
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Camera Capture Dialog */}
        <Dialog open={isCameraActive} onOpenChange={(open) => {
          if (!open) stopCameraStream();
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-red-500" />
                Ambil Foto Barang
              </DialogTitle>
            </DialogHeader>
            <div className="relative aspect-video w-full rounded-md border overflow-hidden bg-black flex items-center justify-center">
              {cameraError ? (
                <div className="p-4 text-center text-xs text-red-400 flex flex-col items-center gap-2">
                  <AlertCircle className="h-8 w-8" />
                  <p>{cameraError}</p>
                </div>
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <DialogFooter className="flex justify-between sm:justify-between items-center w-full">
              <Button variant="outline" onClick={stopCameraStream}>
                Batal
              </Button>
              {!cameraError && (
                <Button onClick={capturePhoto} className="bg-red-500 hover:bg-red-600 text-white">
                  <Camera className="h-4 w-4 mr-2" />
                  Jepret Foto
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
