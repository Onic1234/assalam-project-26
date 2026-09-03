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
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const fetchVideoDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return '';
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setVideoDevices(videoInputs);
      const savedDeviceId = typeof window !== 'undefined' ? localStorage.getItem('preferred_camera_device_id') : null;
      if (savedDeviceId && videoInputs.some((d) => d.deviceId === savedDeviceId)) {
        setSelectedDeviceId(savedDeviceId);
        return savedDeviceId;
      } else if (videoInputs.length > 0) {
        const defaultId = videoInputs[0].deviceId;
        setSelectedDeviceId(defaultId);
        return defaultId;
      }
    } catch (e) {
      console.error('Error enumerating video devices:', e);
    }
    return '';
  };

  const codeReaderRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Dynamic loading of ZXing for Barcode & QR scanning (tries local npm first, CDN fallback)
  const loadZXingScript = async (): Promise<any> => {
    if (typeof window === 'undefined') return null;

    try {
      const zxingModule = await import('@zxing/library');
      if (zxingModule && zxingModule.BrowserMultiFormatReader) {
        return zxingModule;
      }
    } catch (e) {
      console.warn('Direct npm import of @zxing/library failed, using fallback:', e);
    }

    if ((window as any).ZXing && (window as any).ZXing.BrowserMultiFormatReader) {
      return (window as any).ZXing;
    }

    return new Promise((resolve) => {
      const scriptId = 'zxing-cdn-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement;

      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://unpkg.com/@zxing/library@latest/umd/index.min.js';
        script.async = true;
        document.body.appendChild(script);
      }

      script.onload = () => resolve((window as any).ZXing);
      script.onerror = () => {
        const fallbackScript = document.createElement('script');
        fallbackScript.id = 'zxing-cdn-script-fallback';
        fallbackScript.src = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
        fallbackScript.async = true;
        fallbackScript.onload = () => resolve((window as any).ZXing);
        fallbackScript.onerror = () => resolve(null);
        document.body.appendChild(fallbackScript);
      };
    });
  };

  useEffect(() => {
    loadZXingScript();
    return () => {
      stopCameraStream();
    };
  }, []);

  // Autofokus input jika tidak memakai kamera
  useEffect(() => {
    if (!useCamera && inputRef.current) {
      inputRef.current.focus();
    }
  }, [useCamera]);

  const handleBack = () => {
    stopCameraStream();
    router.push('/Member');
  };

  // Menghentikan stream kamera
  const stopCameraStream = () => {
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (e) {
        console.error('Error resetting code reader:', e);
      }
      codeReaderRef.current = null;
    }
    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {}
      localStreamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch (e) {}
    }
  };

  // Memulai stream kamera dengan ZXing Barcode/QR Scanner
  const startCameraStream = async (targetDeviceId?: string) => {
    stopCameraStream();
    setError(null);
    setIsCameraLoading(true);
    try {
      if (typeof navigator !== 'undefined' && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
        throw new Error('Kamera membutuhkan koneksi aman (HTTPS). Pastikan situs diakses melalui HTTPS.');
      }

      const ZXingClass = await loadZXingScript();
      if (!ZXingClass || !ZXingClass.BrowserMultiFormatReader) {
        throw new Error('Modul pemindai kamera belum siap.');
      }

      setUseCamera(true);

      let attempts = 0;
      while (!videoRef.current && attempts < 10) {
        await new Promise((r) => setTimeout(r, 100));
        attempts++;
      }

      if (!videoRef.current) {
        throw new Error('Elemen kamera tidak ditemukan.');
      }

      const codeReader = new ZXingClass.BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      const requestedId = targetDeviceId !== undefined ? targetDeviceId : selectedDeviceId;

      const onScanResult = (result: any, err: any) => {
        if (result && result.getText()) {
          const scannedCode = result.getText().trim();
          console.log('[DEBUG] Barcode / QR Code terdeteksi:', scannedCode);
          setIdInput(scannedCode);
          stopCameraStream();
          handleCodeScanned(scannedCode);
        }
      };

      try {
        if (requestedId && requestedId.trim() !== '') {
          await codeReader.decodeFromVideoDevice(requestedId, videoRef.current, onScanResult);
        } else {
          await codeReader.decodeFromVideoDevice(undefined, videoRef.current, onScanResult);
        }
      } catch (firstErr) {
        console.warn('Camera decoding with decodeFromVideoDevice failed, trying decodeFromConstraints:', firstErr);
        await codeReader.decodeFromConstraints(
          { video: true },
          videoRef.current,
          onScanResult
        );
      }

      setIsCameraLoading(false);
      fetchVideoDevices();
    } catch (err: any) {
      console.error('Gagal mengakses kamera:', err);
      setError(err.message || 'Kamera tidak dapat diakses. Berikan izin akses kamera.');
      setIsCameraLoading(false);
      setUseCamera(false);
    }
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
              {useCamera ? 'Arahkan Barcode / QR Code kartu member Anda ke kamera' : 'Dekatkan kartu ke reader atau masukkan ID di bawah ini'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            
            {/* Viewfinder Kamera Scanner */}
            {useCamera ? (
              <div className="space-y-2">
                {videoDevices.length > 0 && (
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-800/80 rounded border border-indigo-500/30 text-xs">
                    <Camera className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                    <span className="font-semibold text-slate-300 flex-shrink-0">Pilih Kamera:</span>
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => {
                        const newId = e.target.value;
                        setSelectedDeviceId(newId);
                        localStorage.setItem('preferred_camera_device_id', newId);
                        startCameraStream(newId);
                      }}
                      className="flex-1 h-7 text-xs rounded border border-indigo-500/30 bg-slate-900 text-white px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    >
                      {videoDevices.map((device, idx) => (
                        <option key={device.deviceId || idx} value={device.deviceId}>
                          {device.label || `Kamera USB / Eksternal ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-indigo-500/40">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {/* Overlay Scanning Laser */}
                  <div className="absolute inset-0 border-2 border-dashed border-indigo-400/30 m-6 rounded flex items-center justify-center pointer-events-none">
                    <div className="w-full h-[2px] bg-red-500 shadow-md shadow-red-500 absolute animate-[scanLaser_2.5s_ease-in-out_infinite]" />
                    <span className="text-xs text-indigo-300 bg-slate-900/80 px-2 py-1 rounded">Memindai Barcode / QR...</span>
                  </div>
                </div>
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
              disabled={isCameraLoading}
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
                  Gunakan Scanner Kamera (Scan Barcode / QR)
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
