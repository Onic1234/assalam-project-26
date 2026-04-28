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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Upload, QrCode, ImageIcon, RefreshCw, Plus } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import { toast } from '@/hooks/use-toast';

// --- PENGATURAN API & OTENTIKASI ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Membuat header otentikasi untuk panggilan API.
 */
const getAuthHeaders = (includeContentType = false): HeadersInit => {
  const headers: HeadersInit = {};

  // Ambil token dari localStorage atau sessionStorage
  const token =
    localStorage.getItem('authToken') || sessionStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

// Interface untuk QRIS data
interface QrisData {
  key: string;
  value: string; // Base64 data URL
}

// Interface untuk response API
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export default function QrisSettingsPage() {
  const [qrisData, setQrisData] = useState<QrisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Fetch QRIS data saat component mount
  useEffect(() => {
    fetchQrisData();
  }, []);

  // --- FUNGSI PENGAMBILAN DATA ---
  const fetchQrisData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/settings/qris`, {
        method: 'GET',
        headers: getAuthHeaders(false),
      });

      if (response.status === 404) {
        // QRIS belum ada
        setQrisData(null);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<QrisData> = await response.json();

      if (result.success && result.data) {
        setQrisData(result.data);
      } else {
        setQrisData(null);
      }
    } catch (error) {
      console.error('Error fetching QRIS data:', error);
      // Jika error 404, berarti belum ada QRIS
      setQrisData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // --- FUNGSI UPLOAD FILE ---
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'File harus berupa gambar (PNG, JPG, JPEG)',
        variant: 'destructive',
      });
      return;
    }

    // Validasi ukuran file (maksimal 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'Ukuran file maksimal 10MB',
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);

    // Buat preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // --- FUNGSI UPLOAD QRIS ---
  const handleUploadQris = async () => {
    if (!selectedFile) {
      toast({
        title: 'Error',
        description: 'Pilih file gambar terlebih dahulu',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`${API_BASE_URL}/settings/qris`, {
        method: 'POST',
        headers: getAuthHeaders(false), // Jangan set Content-Type untuk FormData
        body: formData,
      });

      const result: ApiResponse = await response.json();

      if (result.success) {
        toast({
          title: 'Berhasil',
          description: qrisData
            ? 'QRIS berhasil diperbarui'
            : 'QRIS berhasil dibuat',
        });
        setIsUploadDialogOpen(false);
        resetUploadForm();
        fetchQrisData();
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Gagal mengunggah QRIS',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error uploading QRIS:', error);
      toast({
        title: 'Error',
        description:
          'Gagal mengunggah QRIS. Periksa koneksi atau token autentikasi.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  // --- FUNGSI RESET FORM ---
  const resetUploadForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    // Reset input file
    const fileInput = document.getElementById('qris-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // --- FUNGSI REFRESH DATA ---
  const handleRefresh = () => {
    fetchQrisData();
    toast({
      title: 'Info',
      description: 'Data QRIS telah diperbarui',
    });
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
            <h1 className="text-lg font-semibold">Pengaturan QRIS</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <QrCode className="h-5 w-5" />
                      Status QRIS
                    </CardTitle>
                    <CardDescription>
                      Kelola kode QR untuk pembayaran QRIS
                    </CardDescription>
                  </div>
                  <Badge variant={qrisData ? 'default' : 'secondary'}>
                    {loading
                      ? 'Loading...'
                      : qrisData
                      ? 'Aktif'
                      : 'Belum Diatur'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Memuat data QRIS...
                      </p>
                    </div>
                  </div>
                ) : qrisData ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground mb-2">
                          QRIS sudah diatur dan siap digunakan untuk pembayaran.
                        </p>
                        <div className="flex gap-2">
                          <Dialog
                            open={isUploadDialogOpen}
                            onOpenChange={(open) => {
                              if (!open) {
                                resetUploadForm();
                              }
                              setIsUploadDialogOpen(open);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button>
                                <Upload className="mr-2 h-4 w-4" />
                                Ganti QRIS
                              </Button>
                            </DialogTrigger>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <QrCode className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">
                      QRIS Belum Diatur
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Unggah kode QR QRIS untuk mengaktifkan pembayaran digital
                    </p>
                    <Dialog
                      open={isUploadDialogOpen}
                      onOpenChange={(open) => {
                        if (!open) {
                          resetUploadForm();
                        }
                        setIsUploadDialogOpen(open);
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Buat QRIS
                        </Button>
                      </DialogTrigger>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preview Card - Hanya tampil jika ada QRIS */}
            {qrisData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Preview QRIS
                  </CardTitle>
                  <CardDescription>
                    Kode QR yang sedang aktif untuk pembayaran
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <div className="border rounded-lg p-4 bg-white">
                      <img
                        src={qrisData.value || '/placeholder.svg'}
                        alt="QRIS Code"
                        className="max-w-xs max-h-xs object-contain"
                        style={{ maxWidth: '300px', maxHeight: '300px' }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upload Dialog */}
            <Dialog
              open={isUploadDialogOpen}
              onOpenChange={(open) => {
                if (!open) {
                  resetUploadForm();
                }
                setIsUploadDialogOpen(open);
              }}
            >
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {qrisData ? 'Ganti QRIS' : 'Buat QRIS Baru'}
                  </DialogTitle>
                  <DialogDescription>
                    {qrisData
                      ? 'Unggah gambar QR baru untuk mengganti QRIS yang ada'
                      : 'Unggah gambar QR untuk membuat QRIS baru'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="qris-file">Pilih File Gambar</Label>
                    <Input
                      id="qris-file"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      disabled={uploading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Format: PNG, JPG, JPEG. Maksimal 10MB
                    </p>
                  </div>

                  {/* Preview */}
                  {previewUrl && (
                    <div className="space-y-2">
                      <Label>Preview</Label>
                      <div className="flex justify-center">
                        <div className="border rounded-lg p-2 bg-white">
                          <img
                            src={previewUrl || '/placeholder.svg'}
                            alt="Preview QRIS"
                            className="max-w-full max-h-48 object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {qrisData && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Perhatian:</strong> Mengganti QRIS akan menimpa
                        kode QR yang sudah ada.
                      </p>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsUploadDialogOpen(false)}
                    disabled={uploading}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleUploadQris}
                    disabled={!selectedFile || uploading}
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Mengunggah...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        {qrisData ? 'Ganti QRIS' : 'Buat QRIS'}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
