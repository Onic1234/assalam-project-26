'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    // 1. Pemeriksaan awal: Cek apakah token ada di localStorage
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.replace('/login');
      return;
    }

    setAuthorized(true);

    // 2. Interseptor fetch global untuk menangkap respon 401 (token kedaluwarsa)
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('token'); // Hapus token dari sesi jika ada
        window.location.href = '/login'; // Redirect paksa bersih
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [router]);

  if (!authorized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-zinc-400 font-medium animate-pulse">Memeriksa otorisasi...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
