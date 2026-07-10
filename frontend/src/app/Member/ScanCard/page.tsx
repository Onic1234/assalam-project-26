'use client';

import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CreditCard, Loader2, CheckCircle, AlertCircle, Camera, VideoOff, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MemberScanCardPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [idInput, setIdInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);

  // States untuk Kamera Scanner
  const [useCamera, setUseCamera] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const scanIntervalRef = useRef<number | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // 1. Muat library jsQR secara dinamis dari CDN
  useEffect(() => {
    const scriptId = 'jsqr-cdn-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
      script.async = true;
      script.onload = () => {
        setScriptLoaded(true);
        console.log('[DEBUG] jsQR loaded successfully.');
      };
      document.body.appendChild(script);
    } else {
      setScriptLoaded(true);
    }

    return () => {
      stopCameraStream();
    };
  }, []);

  // 2. Autofokus input jika tidak memakai kamera
  useEffect(() => {
    if (!useCamera && inputRef.current) {
      inputRef.current.focus();
    }
  }, [useCamera]);

  const handleBack = () => {
    stopCameraStream();
    router.push('/Member');
  };

  // 3. Menghentikan stream kamera
  const stopCameraStream = () => {
    if (scanIntervalRef.current) {
      cancelAnimationFrame(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // 4. Memulai stream kamera
  const startCameraStream = async (mode: 'user' | 'environment' = facingMode) => {
    stopCameraStream();
    setError(null);
    setIsCameraLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      localStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // diperlukan untuk iOS
        videoRef.current.play();
      }
      setUseCamera(true);
      // Mulai loop pemindaian QR
      scanIntervalRef.current = requestAnimationFrame(scanTick);
    } catch (err) {
      console.error('Gagal mengakses kamera:', err);
      setError('Kamera tidak dapat diakses. Berikan izin akses kamera di browser Anda.');
      setUseCamera(false);
    } finally {
      setIsCameraLoading(false);
    }
  };

  // 5. Loop pemindaian frame video menggunakan jsQR
  const scanTick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          // Gambar frame video ke canvas tersembunyi
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Decode QR
          // @ts-ignore
          if (window.jsQR) {
            // @ts-ignore
            const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });

            if (code && code.data) {
              console.log('[DEBUG] QR Code terdeteksi:', code.data);
              // Pemicu check-in jika terdeteksi
              handleCodeScanned(code.data);
              return; // keluar dari loop scan untuk mencegah request ganda
            }
          }
        }
      }
    }
    // Lanjutkan frame berikutnya
    scanIntervalRef.current = requestAnimationFrame(scanTick);
  };

  // 6. Tangani kode yang didapat dari scan kamera
  const handleCodeScanned = async (scannedCode: string) => {
    stopCameraStream();
    setIsProcessing(true);
    setError(null);
    setStatus('idle');

    try {
      const response = await fetch(`${API_BASE_URL}/ticketing/member/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_member: scannedCode.trim() }),
      });

      const result = await response.json();

      if (response.ok) {
        setStatus('success');
        setTimeout(() => {
          const saleData = result.data;
          const receiptData = {
            memberName: saleData.customerName,
            memberType: 'non-santri',
            accessDate: saleData.Tanggal_Kunjungan || new Date().toISOString(),
            accessType: 'Akses Masuk (Scan QR Kamera)',
            price: 0,
            total: 0,
          };
          router.push(
            `/Receipt?type=faceid&data=${encodeURIComponent(
              JSON.stringify(receiptData)
            )}`
          );
        }, 1500);
      } else {
        setStatus('failed');
        setError(result.message || 'ID kartu tidak valid atau member sudah kedaluwarsa.');
        // Beri jeda 3 detik sebelum mengaktifkan kamera scan lagi untuk re-try
        setTimeout(() => {
          startCameraStream();
        }, 3000);
      }
    } catch (err: any) {
      console.error('Error member card check-in:', err);
      setStatus('failed');
      setError('Gagal terhubung ke server.');
      setTimeout(() => {
        startCameraStream();
      }, 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  // 7. Tangani submit input manual
  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idInput.trim()) return;

    setIsProcessing(true);
    setError(null);
    setStatus('idle');

    try {
      const response = await fetch(`${API_BASE_URL}/ticketing/member/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_member: idInput.trim() }),
      });

      const result = await response.json();

      if (response.ok) {
        setStatus('success');
        setTimeout(() => {
          const saleData = result.data;
          const receiptData = {
            memberName: saleData.customerName,
            memberType: 'non-santri',
            accessDate: saleData.Tanggal_Kunjungan || new Date().toISOString(),
            accessType: 'Akses Masuk (Kartu Member)',
            price: 0,
            total: 0,
          };
          router.push(
            `/Receipt?type=faceid&data=${encodeURIComponent(
              JSON.stringify(receiptData)
            )}`
          );
        }, 1500);
      } else {
        setStatus('failed');
        setError(result.message || 'ID kartu tidak valid atau member sudah kedaluwarsa.');
      }
    } catch (err: any) {
      console.error('Error member card check-in:', err);
      setStatus('failed');
      setError('Gagal terhubung ke server.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePageClick = () => {
    if (!useCamera && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const toggleMode = () => {
    if (useCamera) {
      stopCameraStream();
      setUseCamera(false);
    } else {
      startCameraStream();
    }
  };

  const toggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (useCamera) {
      startCameraStream(nextMode);
    }
  };

  return (
    <div 
      onClick={handlePageClick} 
      className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 flex flex-col justify-between text-white"
    >
      {/* Header */}
      <div className="border-b border-indigo-900/40 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={handleBack} 
          className="text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Menu
        </Button>
        <div className="text-right">
          <span className="text-xs text-indigo-400 font-semibold tracking-wider uppercase">Assalam Olympic Pool</span>
          <h2 className="text-sm font-bold text-slate-100">Gate Check-In Member</h2>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-slate-900/80 border-indigo-500/30 text-white shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-indigo-500/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 border border-indigo-500/20">
              <CreditCard className="h-8 w-8 text-indigo-400 animate-pulse" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-100">Tempel / Scan Kartu Member</CardTitle>
            <CardDescription className="text-slate-400">
              {useCamera ? 'Arahkan QR Code kartu member Anda ke kamera' : 'Dekatkan kartu ke reader atau masukkan ID di bawah ini'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            
            {/* Viewfinder Kamera Scanner */}
            {useCamera ? (
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-indigo-500/40">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Overlay Scanning Laser */}
                <div className="absolute inset-0 border-2 border-dashed border-indigo-400/30 m-6 rounded flex items-center justify-center pointer-events-none">
                  <div className="w-full h-[2px] bg-red-500 shadow-md shadow-red-500 absolute animate-[scanLaser_2.5s_ease-in-out_infinite]" />
                  <span className="text-xs text-indigo-300 bg-slate-900/80 px-2 py-1 rounded">Memindai QR...</span>
                </div>
                {/* Tombol Switch Kamera */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation(); // mencegah page click refocusing
                    toggleFacingMode();
                  }}
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2 bg-slate-900/80 border border-indigo-500/30 hover:bg-slate-800 text-white gap-1.5 text-xs h-8"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Kamera {facingMode === 'environment' ? 'Depan' : 'Belakang'}
                </Button>
              </div>
            ) : (
              /* Form Manual/USB Input */
              <form onSubmit={handleManualCheckIn} className="space-y-4">
                <div className="relative">
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Scan kartu fisik member..."
                    value={idInput}
                    onChange={(e) => setIdInput(e.target.value)}
                    disabled={isProcessing}
                    className="w-full text-center text-xl font-mono py-6 bg-slate-950/80 border-indigo-500/30 text-indigo-300 focus-visible:ring-indigo-500 placeholder:text-slate-600 rounded-lg"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isProcessing || !idInput.trim()}
                  className="w-full py-6 text-lg font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all duration-300 hover:scale-[1.02]"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    'Masuk Stadium'
                  )}
                </Button>
              </form>
            )}

            {/* Tombol Toggle Kamera */}
            <Button
              onClick={toggleMode}
              disabled={isCameraLoading || !scriptLoaded}
              variant="outline"
              className="w-full py-5 border-indigo-500/30 hover:bg-indigo-950 text-indigo-300 hover:text-white"
            >
              {isCameraLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengaktifkan Kamera...
                </>
              ) : useCamera ? (
                <>
                  <VideoOff className="mr-2 h-4 w-4" />
                  Gunakan Input Manual / USB Reader
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Gunakan Scanner Kamera (Scan QR)
                </>
              )}
            </Button>

            {status === 'success' && (
              <div className="flex items-center gap-3 p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-lg animate-bounce">
                <CheckCircle className="h-6 w-6 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-sm">Akses Berhasil Diterima</h4>
                  <p className="text-xs text-emerald-500/80">Selamat datang, mencetak tiket masuk...</p>
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-400 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
              </Alert>
            )}

            {!useCamera && (
              <div className="text-center text-xs text-slate-500">
                *Klik di mana saja pada layar ini jika input reader kehilangan fokus.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Global CSS Animation for Laser Scan */}
      <style jsx global>{`
        @keyframes scanLaser {
          0%, 100% { top: 10%; }
          50% { top: 90%; }
        }
      `}</style>

      {/* Footer */}
      <div className="text-center py-6 border-t border-indigo-900/30 bg-slate-950/20 text-slate-500 text-xs">
        &copy; {new Date().getFullYear()} Assalam Olympic Pool Stadium. All rights reserved.
      </div>
    </div>
  );
}
