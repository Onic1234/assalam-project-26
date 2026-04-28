'use client';

import { useState } from 'react';
import FaceIdCamera from '@/components/face-id-camera';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { User, Shield } from 'lucide-react';

// Tipe member yang didukung
type MemberType = 'santri' | 'ppmi';

export default function ScanPage() {
  const [memberType, setMemberType] = useState<MemberType | null>(null);

  // Fungsi untuk kembali ke halaman pemilihan
  const handleReset = () => {
    setMemberType(null);
  };

  // Jika belum ada tipe member yang dipilih, tampilkan pilihan
  if (!memberType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Pilih Akses Anda</CardTitle>
            <CardDescription>
              Silakan pilih kategori Anda untuk melanjutkan pemindaian wajah.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button
              onClick={() => setMemberType('santri')}
              size="lg"
              className="w-full"
            >
              <User className="mr-2 h-5 w-5" />
              Saya Santri
            </Button>
            <Button
              onClick={() => setMemberType('ppmi')}
              size="lg"
              className="w-full"
            >
              <Shield className="mr-2 h-5 w-5" />
              Saya Anggota PPMI
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Jika tipe member sudah dipilih, tampilkan kamera
  return (
    <FaceIdCamera
      title={`Akses ${memberType === 'santri' ? 'Santri' : 'PPMI'}`}
      description="Posisikan wajah Anda di dalam lingkaran untuk memindai"
      memberType={memberType}
      onReset={handleReset}
    />
  );
}
