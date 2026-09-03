'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, VideoOff, RefreshCw, Loader2, CheckCircle2, CreditCard, ChevronRight, Wallet, QrCode } from 'lucide-react';

interface MemberDetails {
  id: number;
  id_member: string;
  Nama: string;
  balance: {
    amount: number;
  };
  transactions?: Array<{
    id: number;
    total_amount: number;
    payment_method: string;
    Transaction_type?: string;
    createdAt: string;
  }>;
}

export default function PublicTopupPage() {
  const router = useRouter();
  
  // Camera/Scan states & refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<any>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Verify Card, 2: Amount & Method, 3: Success
  const [idMemberInput, setIdMemberInput] = useState('');
  const [memberInfo, setMemberInfo] = useState<MemberDetails | null>(null);
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Top Up config states
  const [topupAmount, setTopupAmount] = useState<number>(50000);
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'QRIS' | 'Tunai'>('QRIS');
  const [isProcessingTopup, setIsProcessingTopup] = useState(false);
  const [newBalance, setNewBalance] = useState<number>(0);

  const PRESETS = [10000, 20000, 50000, 100000, 200000];

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

  const startCameraStream = async (mode: 'user' | 'environment' = facingMode) => {
    stopCameraStream();
    setCameraError(null);
    setIsCameraLoading(true);
    try {
      if (typeof navigator !== 'undefined' && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
        throw new Error('Kamera membutuhkan koneksi aman (HTTPS). Pastikan situs diakses melalui HTTPS.');
      }

      const ZXingClass = await loadZXingScript();
      if (!ZXingClass || !ZXingClass.BrowserMultiFormatReader) {
        throw new Error('Modul pemindai kamera belum siap.');
      }

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

      const onScanResult = (result: any, err: any) => {
        if (result && result.getText()) {
          const scannedCode = result.getText().trim();
          console.log('[DEBUG] Barcode / QR Code scanned on Topup page:', scannedCode);
          setIdMemberInput(scannedCode);
          setIsScanOpen(false);
          stopCameraStream();
          handleVerifyCard(scannedCode);
        }
      };

      try {
        await codeReader.decodeFromVideoDevice(undefined, videoRef.current, onScanResult);
      } catch (firstErr) {
        console.warn('Camera decoding with decodeFromVideoDevice failed, trying decodeFromConstraints:', firstErr);
        await codeReader.decodeFromConstraints(
          { video: { facingMode: mode } },
          videoRef.current,
          onScanResult
        );
      }
    } catch (err: any) {
      console.error('Gagal mengakses kamera:', err);
      setCameraError(err.message || 'Kamera tidak dapat diakses. Silakan berikan izin akses kamera.');
    } finally {
      setIsCameraLoading(false);
    }
  };

  const handleStartScan = () => {
    setIsScanOpen(true);
    setTimeout(() => {
      startCameraStream(facingMode);
    }, 300);
  };

  const handleCloseScan = () => {
    setIsScanOpen(false);
    stopCameraStream();
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCameraStream(nextMode);
  };

  const handleVerifyCard = async (overrideId?: string) => {
    const idToVerify = overrideId || idMemberInput;
    if (!idToVerify.trim()) {
      toast({
        title: 'Input Kosong',
        description: 'Silakan scan atau ketik ID kartu member terlebih dahulu.',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/public/member/search/${encodeURIComponent(idToVerify.trim())}`);
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Kartu member tidak valid atau tidak terdaftar.');
      }

      setMemberInfo(result.data);
      setStep(2); // Pindah ke pemilihan nominal & metode pembayaran
      toast({
        title: 'Kartu Terverifikasi',
        description: `Halo, ${result.data.Nama}! Silakan tentukan nominal dan cara pembayaran.`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Verifikasi Gagal',
        description: error.message || 'Gagal memverifikasi kartu member.',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSelectPreset = (amount: number) => {
    setTopupAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (val: string) => {
    setCustomAmount(val);
    const parsed = parseInt(val) || 0;
    setTopupAmount(parsed);
  };

  const handleProcessTopup = async () => {
    if (!memberInfo) return;
    if (topupAmount <= 0) {
      toast({
        title: 'Nominal Tidak Valid',
        description: 'Nominal top up harus lebih besar dari Rp 0.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessingTopup(true);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/public/topup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_member: memberInfo.id_member,
          amount: topupAmount,
          payment_method: paymentMethod,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Gagal memproses pengisian saldo.');
      }

      setNewBalance(result.data.new_balance);
      setStep(3); // Pindah langsung ke halaman sukses
      toast({
        title: 'Top Up Berhasil',
        description: 'Saldo Anda telah berhasil ditambahkan.',
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Proses Gagal',
        description: error.message || 'Gagal memproses transaksi top up.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingTopup(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-indigo-100 flex flex-col justify-between">
      
      {/* Navbar */}
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              stopCameraStream();
              router.push('/');
            }}
            className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Beranda
          </Button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-indigo-900 tracking-wider">ASSALAM</span>
            <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded">SELF-SERVICE</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-md w-full mx-auto px-4 py-8 flex flex-col justify-center">
        
        {/* Progress Stepper (Simplified 2-Step) */}
        <div className="flex items-center justify-between mb-8 px-8 text-xs font-semibold text-slate-400">
          <div className={`flex flex-col items-center gap-1.5 ${step >= 1 ? 'text-indigo-600' : ''}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center border text-[11px] ${step >= 1 ? 'border-indigo-600 bg-indigo-50 font-bold' : 'border-slate-300 bg-white'}`}>1</span>
            <span>Verifikasi Kartu</span>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-300" />
          <div className={`flex flex-col items-center gap-1.5 ${step >= 2 ? 'text-indigo-600' : ''}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center border text-[11px] ${step >= 2 ? 'border-indigo-600 bg-indigo-50 font-bold' : 'border-slate-300 bg-white'}`}>2</span>
            <span>Nominal & Bayar</span>
          </div>
        </div>

        {/* STEP 1: VERIFIKASI KARTU */}
        {step === 1 && (
          <Card className="shadow-lg border-slate-200">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <CreditCard className="h-6 w-6 text-indigo-600" />
              </div>
              <CardTitle className="text-xl font-bold text-slate-900">Verifikasi Kartu Member</CardTitle>
              <CardDescription>Scan QR Code kartu member Anda atau masukkan ID secara manual.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="card-input" className="text-xs uppercase tracking-wider text-slate-500 font-bold">ID Kartu Member</Label>
                <div className="flex gap-2">
                  <Input
                    id="card-input"
                    type="text"
                    placeholder="Contoh: MBR260700001"
                    value={idMemberInput}
                    onChange={(e) => setIdMemberInput(e.target.value)}
                    className="flex-grow font-mono text-indigo-700 tracking-wide border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
                    disabled={isVerifying}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyCard()}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleStartScan}
                    disabled={isVerifying}
                    className="border-indigo-200 hover:bg-indigo-50 text-indigo-600 shrink-0"
                    title="Scan Kartu via Kamera"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => handleVerifyCard()}
                disabled={isVerifying || !idMemberInput.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-5"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memverifikasi...
                  </>
                ) : (
                  'Verifikasi Kartu'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: NOMINAL & METODE PEMBAYARAN */}
        {step === 2 && memberInfo && (
          <Card className="shadow-lg border-slate-200">
            <CardHeader className="border-b pb-4 bg-slate-50/50">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded uppercase">MEMBER</span>
                  <CardTitle className="text-lg font-bold text-slate-900 mt-2">{memberInfo.Nama}</CardTitle>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">{memberInfo.id_member}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">Saldo Saat Ini</span>
                  <span className="text-lg font-extrabold text-slate-800">{formatCurrency(memberInfo.balance.amount)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              {/* Nominal Presets */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Pilih Nominal Top Up</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((p) => (
                    <Button
                      key={p}
                      variant="outline"
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      className={`py-4 font-semibold text-slate-800 transition-all ${
                        topupAmount === p && !customAmount
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {formatCurrency(p)}
                    </Button>
                  ))}
                  
                  <div className="col-span-2 mt-2">
                    <Label htmlFor="custom-amount" className="text-xs text-slate-500 mb-1 block">Nominal Lain (Rp)</Label>
                    <Input
                      id="custom-amount"
                      type="number"
                      placeholder="Masukkan nominal bebas. Contoh: 25000"
                      value={customAmount}
                      onChange={(e) => handleCustomAmountChange(e.target.value)}
                      className="w-full text-base font-bold text-indigo-700 border-slate-300"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Pilih Metode Pembayaran</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={paymentMethod === 'QRIS' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('QRIS')}
                    className={`py-6 flex items-center justify-center gap-2 font-semibold text-sm ${paymentMethod === 'QRIS' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'text-slate-700'}`}
                  >
                    <QrCode className="h-4 w-4" />
                    QRIS
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === 'Tunai' ? 'default' : 'outline'}
                    onClick={() => setPaymentMethod('Tunai')}
                    className={`py-6 flex items-center justify-center gap-2 font-semibold text-sm ${paymentMethod === 'Tunai' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'text-slate-700'}`}
                  >
                    <Wallet className="h-4 w-4" />
                    Tunai (Cash)
                  </Button>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-sm text-slate-600 font-medium">Total Top Up:</span>
                <span className="text-2xl font-extrabold text-indigo-700">{formatCurrency(topupAmount)}</span>
              </div>

              {/* Riwayat Aktivitas Terakhir */}
              {memberInfo.transactions && memberInfo.transactions.length > 0 && (
                <div className="space-y-2 border-t pt-4">
                  <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Riwayat Aktivitas Terakhir</Label>
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {memberInfo.transactions.map((tx) => {
                      const isTopUp = tx.Transaction_type === 'topup' || tx.payment_method === 'TopUp' || tx.payment_method === 'QRIS' || tx.payment_method === 'Tunai';
                      return (
                        <div key={tx.id} className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <div>
                            <span className="font-semibold text-slate-700 block">
                              {isTopUp ? `Top Up (${tx.payment_method})` : 'Akses Masuk (Tiket)'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(tx.createdAt).toLocaleString('id-ID', {
                                dateStyle: 'short',
                                timeStyle: 'short'
                              })}
                            </span>
                          </div>
                          <span className={`font-bold ${isTopUp ? 'text-green-600' : 'text-rose-600'}`}>
                            {isTopUp ? '+' : '-'}{formatCurrency(tx.total_amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                  disabled={isProcessingTopup}
                >
                  Kembali
                </Button>
                <Button
                  onClick={handleProcessTopup}
                  disabled={isProcessingTopup || topupAmount <= 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                >
                  {isProcessingTopup ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    'Proses Top Up'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP 3: SUCCESS SCREEN */}
        {step === 3 && memberInfo && (
          <Card className="shadow-lg border-slate-200 overflow-hidden relative">
            <div className="h-2 bg-green-500 w-full absolute top-0 left-0" />
            <CardContent className="pt-10 pb-8 flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-600 scale-110 animate-bounce">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-2xl font-bold text-slate-900">Top Up Sukses!</h3>
                <p className="text-sm text-slate-500">Saldo kartu member telah berhasil ditambahkan.</p>
              </div>

              <div className="w-full divide-y border rounded-xl bg-slate-50/50 overflow-hidden px-4 text-sm">
                <div className="flex justify-between py-3">
                  <span className="text-slate-500">Nama Pemilik:</span>
                  <span className="font-bold text-slate-800">{memberInfo.Nama}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-slate-500">ID Kartu Member:</span>
                  <span className="font-mono text-slate-800">{memberInfo.id_member}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-slate-500">Nominal Diisi:</span>
                  <span className="font-bold text-green-600">+{formatCurrency(topupAmount)}</span>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-slate-500">Metode Pembayaran:</span>
                  <span className="font-semibold text-slate-800 bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded text-xs">{paymentMethod}</span>
                </div>
                <div className="flex justify-between py-3 bg-indigo-50/30 px-2 rounded-b-xl">
                  <span className="text-indigo-900 font-semibold">Saldo Baru Anda:</span>
                  <span className="font-extrabold text-indigo-700 text-base">{formatCurrency(newBalance)}</span>
                </div>
              </div>

              <Button
                onClick={() => {
                  setIdMemberInput('');
                  setMemberInfo(null);
                  setStep(1);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-5"
              >
                Top Up Kartu Lain
              </Button>
            </CardContent>
          </Card>
        )}

      </main>

      {/* Camera Dialog Scanner Pop-up */}
      <Dialog open={isScanOpen} onOpenChange={(open) => {
        if (!open) handleCloseScan();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-indigo-600" />
              Scan QR Kartu Member
            </DialogTitle>
            <DialogDescription>
              Arahkan QR Code kartu member ke kamera untuk dipindai secara otomatis.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border rounded-lg overflow-hidden relative min-h-[300px]">
            {cameraError ? (
              <div className="text-center p-6 space-y-3">
                <VideoOff className="h-12 w-12 text-rose-500 mx-auto" />
                <p className="text-sm font-medium text-slate-700">{cameraError}</p>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => startCameraStream(facingMode)}
                  className="mt-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1.5" /> Coba Lagi
                </Button>
              </div>
            ) : (
              <div className="relative w-full aspect-video max-w-[400px] overflow-hidden rounded border bg-black flex items-center justify-center">
                {isCameraLoading && (
                  <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center text-white text-sm gap-2 z-10">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                    Menyiapkan kamera...
                  </div>
                )}
                
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                
                <canvas ref={canvasRef} className="hidden" />

                <div className="absolute inset-0 border-[30px] border-black/40 pointer-events-none flex items-center justify-center">
                  <div className="w-[180px] h-[180px] border-2 border-indigo-400 border-dashed rounded relative">
                    <div className="absolute -inset-1 border-2 border-indigo-600 rounded pointer-events-none animate-pulse" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex sm:justify-between items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleCameraFacing}
              disabled={isCameraLoading || !!cameraError}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Kamera {facingMode === 'user' ? 'Belakang' : 'Depan'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCloseScan}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer Info */}
      <footer className="py-6 text-center text-xs text-slate-400">
        <p>© 2026 Assalaam Olympic Pool Stadium. Hak Cipta Dilindungi.</p>
      </footer>
    </div>
  );
}

// Dialog imports
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
