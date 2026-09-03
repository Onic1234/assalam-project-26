'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, CreditCard, Clock, Loader2, Camera, VideoOff, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import Image from 'next/image';
import { QrisDisplay } from '@/components/qris-display';

export default function RegulerPage() {
  const router = useRouter();
  // --- CAMERA SCANNER STATE & REFS ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const codeReaderRef = useRef<any>(null);

  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const fetchVideoDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return '';
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput' && d.deviceId);
      setVideoDevices(videoInputs);
      const savedDeviceId = typeof window !== 'undefined' ? localStorage.getItem('preferred_camera_device_id') : null;
      if (savedDeviceId && videoInputs.some((d) => d.deviceId === savedDeviceId)) {
        setSelectedDeviceId(savedDeviceId);
        return savedDeviceId;
      } else if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
        return videoInputs[0].deviceId;
      }
    } catch (e) {
      console.error('Error enumerating video devices:', e);
    }
    return '';
  };

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

  const startCameraStream = async (targetDeviceId?: string) => {
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

      const requestedId = targetDeviceId !== undefined ? targetDeviceId : selectedDeviceId;

      const onScanResult = (result: any) => {
        if (result && result.getText()) {
          const scannedCode = result.getText().trim();
          console.log('[DEBUG] Barcode / QR Code terdeteksi loket:', scannedCode);
          setIdMember(scannedCode);
          handleCloseScan();
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
      console.error('Error starting camera:', err);
      setCameraError(err.message || 'Kamera tidak dapat diakses. Berikan izin akses kamera.');
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

  const [ticketCount, setTicketCount] = useState(1);
  const [visitorName, setVisitorName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [idMember, setIdMember] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris' | 'card_member'>('cash');
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [ticketData, setTicketData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<{
    message: string;
    success: boolean;
  } | null>(null);

  // States for Card Member Balance check
  const [memberInfo, setMemberInfo] = useState<{ id_member?: string; Nama: string; balance: { amount: number } } | null>(null);
  const [isVerifyingMember, setIsVerifyingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  // Fetch Member Details when ID Member changes
  useEffect(() => {
    if (!idMember.trim()) {
      setMemberInfo(null);
      setMemberError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsVerifyingMember(true);
      setMemberError(null);
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${API_BASE_URL}/public/member/search/${encodeURIComponent(idMember.trim())}`);
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || 'Kartu member tidak ditemukan.');
        }
        setMemberInfo(result.data);
        if (result.data && !visitorName.trim()) {
          setVisitorName(result.data.Nama);
        }
      } catch (err: any) {
        setMemberInfo(null);
        setMemberError(err.message || 'Gagal memverifikasi kartu.');
      } finally {
        setIsVerifyingMember(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [idMember]);

  // --- PEMBARUAN STATE HARGA & DISKON ---
  const [priceLoading, setPriceLoading] = useState(true);
  // State untuk menyimpan harga asli sebelum diskon
  const [regularPrice, setRegularPrice] = useState<number | null>(null);
  // State baru untuk menyimpan persentase diskon
  const [regularDiscount, setRegularDiscount] = useState<number>(0);
  // --- AKHIR PEMBARUAN STATE ---

  useEffect(() => {
    const API_BASE_URL =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const fetchTicketPrice = async () => {
      try {
        setPriceLoading(true);
        const response = await fetch(`${API_BASE_URL}/ticketing/prices`);
        if (!response.ok) {
          throw new Error('Gagal mengambil data harga.');
        }
        const prices = await response.json();

        // --- PEMBARUAN LOGIKA FETCH ---
        const regulerPriceData = prices.find(
          (p: { kategori: string }) => p.kategori === 'Reguler'
        );

        if (regulerPriceData) {
          // Simpan harga asli
          setRegularPrice(regulerPriceData.harga);
          // Simpan persentase diskon, default 0 jika tidak ada
          setRegularDiscount(regulerPriceData.discountPercentage || 0);
        } else {
          console.error("Harga untuk kategori 'Reguler' tidak ditemukan.");
          setRegularPrice(null);
          setRegularDiscount(0);
        }
        // --- AKHIR PEMBARUAN LOGIKA FETCH ---
      } catch (error) {
        console.error('Error fetching ticket price:', error);
        setRegularPrice(null);
        setRegularDiscount(0);
      } finally {
        setPriceLoading(false);
      }
    };

    fetchTicketPrice();
  }, []);

  const formatCurrency = (amount: number | null) => {
    if (amount === null || typeof amount !== 'number') return 'N/A';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // --- PEMBARUAN PERHITUNGAN HARGA ---
  // Hitung harga setelah diskon
  const discountedPrice =
    regularPrice !== null
      ? regularPrice - (regularPrice * regularDiscount) / 100
      : null;
  // Hitung total pembayaran berdasarkan harga setelah diskon
  const totalPayment =
    discountedPrice !== null ? discountedPrice * ticketCount : 0;
  // --- AKHIR PEMBARUAN PERHITUNGAN HARGA ---

  const handleBackClick = () => {
    router.push('/');
  };

  const handleIncrement = () => {
    setTicketCount((prev) => prev + 1);
  };

  const handleDecrement = () => {
    if (ticketCount > 1) {
      setTicketCount((prev) => prev - 1);
    }
  };

  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handlePurchase = async () => {
    if (
      !visitorName.trim() ||
      !phoneNumber.trim() ||
      !validatePhoneNumber(phoneNumber) ||
      !agreeToTerms ||
      discountedPrice === null
    ) {
      alert(
        'Harap lengkapi semua data dengan benar dan pastikan harga tersedia.'
      );
      return;
    }

    setIsLoading(true);
    setApiResponse(null);

    const payload = {
      Nama: visitorName,
      No_Telepon: phoneNumber,
      Kuantitas: ticketCount,
      Metode_Pembayaran: paymentMethod === 'cash' ? 'Tunai' : paymentMethod === 'qris' ? 'QRIS' : 'card_member',
      id_member: idMember.trim() || undefined,
    };

    try {
      const API_BASE_URL =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      const response = await fetch(`${API_BASE_URL}/ticketing/reguler`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || result.message);

      setApiResponse({ message: result.message, success: true });

      // --- PEMBARUAN DATA UNTUK STRUK ---
      const dataForReceipt = {
        visitorName,
        phoneNumber,
        ticketCount,
        ticketPrice: discountedPrice, // Menggunakan harga setelah diskon
        total: totalPayment, // Menggunakan total setelah diskon
        purchaseDate: new Date().toISOString(),
        type: 'regular',
        paymentMethod: paymentMethod === 'cash' ? 'Tunai' : paymentMethod === 'qris' ? 'QRIS' : 'Card Member',
        transactionId: result.id || Date.now().toString(),
        idMember: paymentMethod === 'card_member' ? idMember : undefined,
        remainingBalance: paymentMethod === 'card_member' && memberInfo ? (memberInfo.balance.amount - totalPayment) : undefined,
      };
      // --- AKHIR PEMBARUAN DATA UNTUK STRUK ---

      setTicketData(dataForReceipt);

      if (paymentMethod === 'qris') {
        setShowQrisModal(true);
        setIsLoading(false); // Reset loading agar modal/tombol interaktif
      } else {
        router.push(
          `/Receipt?data=${encodeURIComponent(
            JSON.stringify(dataForReceipt)
          )}`
        );
      }
    } catch (error: any) {
      setApiResponse({
        message: error.message || 'Tidak dapat terhubung ke server.',
        success: false,
      });
      setIsLoading(false); // Reset loading jika gagal agar pengguna bisa mencoba lagi
    }
  };

  const handlePaymentComplete = () => {
    setShowQrisModal(false);
    router.push(
      `/Receipt?data=${encodeURIComponent(JSON.stringify(ticketData))}`
    );
  };

  const handleTermsCheckboxChange = (checked: boolean) => {
    if (checked) {
      setShowTermsModal(true);
    } else {
      setAgreeToTerms(false);
    }
  };

  const handleAgreeTerms = () => {
    setAgreeToTerms(true);
    setShowTermsModal(false);
  };

  const handleCancelTerms = () => {
    setAgreeToTerms(false);
    setShowTermsModal(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackClick}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <Image
                  src="/icons/Logo AOPS.png"
                  alt="AOPS"
                  width={64}
                  height={64}
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Tiket Reguler
                </h1>
                <p className="text-sm text-gray-600">
                  Pembelian tiket untuk pengunjung umum
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Ticket Info */}
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center">
                  <Image
                    src="/icons/Tiket Umum Hijau.png"
                    alt="Tiket Reguler"
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>
                <div>
                  <CardTitle className="text-xl">Tiket Reguler</CardTitle>
                  <CardDescription>
                    Akses lengkap fasilitas kolam renang
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* --- PEMBARUAN TAMPILAN HARGA --- */}
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 h-10 flex justify-center items-center">
                  {priceLoading ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : (
                    formatCurrency(discountedPrice) // Tampilkan harga setelah diskon
                  )}
                </div>
                {regularDiscount > 0 && regularPrice !== null && (
                  <div className="text-sm text-gray-500">
                    <span className="line-through">
                      {formatCurrency(regularPrice)}
                    </span>
                    <span className="ml-2 font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      Diskon {regularDiscount}%
                    </span>
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-1">Per orang</p>
              </div>
              {/* --- AKHIR PEMBARUAN TAMPILAN HARGA --- */}

              <div className="space-y-4">
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <h4 className="font-semibold text-yellow-800">
                      Jam Operasional
                    </h4>
                  </div>
                  <p className="text-sm text-yellow-700">06:00 - 18:00 WIB</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchase Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Pembelian Tiket Reguler
              </CardTitle>
              <CardDescription>
                Masukkan data pengunjung dan pilih jumlah tiket
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {apiResponse && (
                <div
                  className={`p-3 rounded-md text-sm text-center ${
                    apiResponse.success
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}
                >
                  {apiResponse.message}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="visitorName"
                    className="text-sm font-medium text-gray-700"
                  >
                    Nama Pengunjung *
                  </Label>
                  <Input
                    id="visitorName"
                    type="text"
                    placeholder="Masukkan nama lengkap"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    className="w-full"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="phoneNumber"
                    className="text-sm font-medium text-gray-700"
                  >
                    Nomor Telepon *
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="Contoh: 081234567890"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full"
                    disabled={isLoading}
                  />
                  {!validatePhoneNumber(phoneNumber) &&
                    phoneNumber.length > 0 && (
                      <p className="text-xs text-red-500">
                        Format nomor telepon tidak valid.
                      </p>
                    )}
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="idMember"
                    className="text-sm font-medium text-gray-700 flex items-center justify-between"
                  >
                    <span>ID Kartu Member (Opsional)</span>
                    <span className="text-xs text-slate-400 font-normal">
                      {paymentMethod === 'card_member' ? '*Wajib untuk saldo kartu' : 'Opsional'}
                    </span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="idMember"
                      type="text"
                      placeholder="Scan / Masukkan ID kartu jika ada"
                      value={idMember}
                      onChange={(e) => setIdMember(e.target.value)}
                      className="flex-grow font-mono text-indigo-600 border-indigo-100 placeholder:font-sans placeholder:text-gray-400"
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleStartScan}
                      disabled={isLoading}
                      className="border-indigo-200 hover:bg-indigo-50 text-indigo-600 shrink-0"
                      title="Scan Kartu via Kamera"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  {isVerifyingMember && (
                    <p className="text-xs text-indigo-500 flex items-center gap-1 mt-1">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Memverifikasi kartu...
                    </p>
                  )}
                  {memberError && (
                    <p className="text-xs text-red-500 mt-1">{memberError}</p>
                  )}
                  {memberInfo && (
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 space-y-1.5 text-xs text-indigo-950 mt-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Nomor Kartu</span>
                        <span className="font-mono font-semibold text-slate-800">{memberInfo.id_member || idMember}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Saldo Kartu</span>
                        <span className="font-bold text-indigo-700">{formatCurrency(memberInfo.balance.amount)}</span>
                      </div>
                      <div className="flex justify-between border-t border-indigo-200/50 pt-1.5">
                        <span className="text-slate-500 font-semibold">Estimasi Sisa Saldo</span>
                        <span className={`font-bold ${memberInfo.balance.amount - totalPayment >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {formatCurrency(memberInfo.balance.amount - totalPayment)}
                        </span>
                      </div>
                      {memberInfo.balance.amount - totalPayment < 0 && (
                        <div className="text-red-600 font-medium text-[10px] mt-1 bg-red-50 border border-red-100 rounded p-1.5 flex items-center gap-1">
                          <span>⚠️ Saldo tidak mencukupi untuk pembelian tiket ini.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  Jumlah Tiket *
                </Label>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDecrement}
                    disabled={ticketCount <= 1 || isLoading}
                    className="w-10 h-10 rounded-full bg-transparent"
                  >
                    -
                  </Button>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {ticketCount}
                    </div>
                    <div className="text-xs text-gray-500">tiket</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleIncrement}
                    disabled={isLoading}
                    className="w-10 h-10 rounded-full bg-transparent"
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* --- PEMBARUAN RINGKASAN PEMBAYARAN --- */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Harga per tiket</span>
                  <span>{formatCurrency(regularPrice)}</span>
                </div>
                {regularDiscount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Diskon ({regularDiscount}%)</span>
                    <span>
                      -{' '}
                      {formatCurrency(
                        regularPrice !== null
                          ? (regularPrice * regularDiscount) / 100
                          : 0
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Jumlah tiket</span>
                  <span>{ticketCount}x</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-green-600">
                      {formatCurrency(totalPayment)}
                    </span>
                  </div>
                </div>
              </div>
              {/* --- AKHIR PEMBARUAN RINGKASAN PEMBAYARAN --- */}

              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  Metode Pembayaran *
                </Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(value) =>
                    setPaymentMethod(value as 'cash' | 'qris' | 'card_member')
                  }
                  disabled={isLoading}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label
                      htmlFor="cash"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Tunai
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="qris" id="qris" />
                    <Label
                      htmlFor="qris"
                      className="text-sm font-medium cursor-pointer"
                    >
                      QRIS
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="card_member" id="card_member" />
                    <Label
                      htmlFor="card_member"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Card Member (Saldo Kartu)
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={agreeToTerms}
                    onCheckedChange={handleTermsCheckboxChange}
                    disabled={isLoading}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="terms"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Saya menyetujui syarat dan ketentuan
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Dengan mencentang, saya menyetujui{' '}
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowTermsModal(true);
                        }}
                        className="text-green-600 hover:underline"
                      >
                        syarat dan ketentuan
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handlePurchase}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg"
                size="lg"
                disabled={
                  !visitorName.trim() ||
                  !phoneNumber.trim() ||
                  !validatePhoneNumber(phoneNumber) ||
                  !agreeToTerms ||
                  isLoading ||
                  priceLoading ||
                  discountedPrice === null ||
                  (paymentMethod === 'card_member' && (!idMember.trim() || !memberInfo || memberInfo.balance.amount < totalPayment))
                }
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    {paymentMethod === 'qris'
                      ? 'Bayar dengan QRIS'
                      : 'Beli Tiket Sekarang'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showQrisModal} onOpenChange={setShowQrisModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Pembayaran QRIS</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-6 py-4">
            <p className="text-lg font-semibold text-gray-900">
              Total: {formatCurrency(ticketData?.total)}
            </p>
            <QrisDisplay
              variant="image-only"
              size="lg"
              showRefresh={true}
              imageClassName="border-2 border-gray-200"
            />
            <p className="text-sm text-gray-600">Scan untuk membayar</p>
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setShowQrisModal(false)}
                className="flex-1"
              >
                Batal
              </Button>
              <Button
                onClick={handlePaymentComplete}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Selesai
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-center">
              Peraturan Kolam Renang
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm text-gray-700 max-h-[60vh] overflow-y-auto p-4">
            <p>
              1. Tamu diharuskan untuk memakai pakaian renang yang pantas
              (Please wearing a proper swimsuit)
            </p>
            <p>
              2. Dilarang membawa makanan dan minuman dari luar (Bringing food
              and beverage from the outside is not allowed)
            </p>
            <p>
              3. Anak di bawah 12 tahun diawasi oleh orang tua atau pengasuh
              setiap waktu (Children under 12 should be accompanied at all time)
            </p>
            <p>
              4. Bilas badan sebelum masuk kolam (Shower before entering the
              pool)
            </p>
            <p>5. Tidak ada petugas life guard (No life guard on duty)</p>
            <p>
              6. Manajemen tidak bertanggung jawab atas kehilangan, kerusakan,
              cedera, atau kematian yang timbul dari penyebab apapun (The
              management shall not be held liable for any loss, damage, injury,
              or death arising from any cause)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelTerms}>
              Batal
            </Button>
            <Button
              onClick={handleAgreeTerms}
              className="bg-green-600 hover:bg-green-700"
            >
              Setuju
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Webcam QR Scanner */}
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

          {videoDevices.length > 0 && (
            <div className="flex items-center gap-2 px-1 py-1.5 bg-slate-100 dark:bg-slate-800 rounded border text-xs">
              <Camera className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
              <span className="font-semibold text-slate-600 dark:text-slate-300 flex-shrink-0">Pilih Kamera:</span>
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedDeviceId(newId);
                  localStorage.setItem('preferred_camera_device_id', newId);
                  startCameraStream(newId);
                }}
                className="flex-1 h-7 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
              >
                {videoDevices.map((device, idx) => (
                  <option key={device.deviceId || idx} value={device.deviceId}>
                    {device.label || `Kamera USB / Eksternal ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

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
                
                {/* Canvas tersembunyi untuk analisis data gambar */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay Penunjuk Frame Scan */}
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
    </div>
  );
}
