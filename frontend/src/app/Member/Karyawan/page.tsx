"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  CreditCard,
  Clock,
  BadgeCheck,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import Image from "next/image";
import { QrisDisplay } from "@/components/qris-display"; // Sesuaikan path jika perlu

export default function KaryawanPage() {
  const router = useRouter();
  const [ticketCount, setTicketCount] = useState(1);
  const [employeeId, setEmployeeId] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris">("cash");
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [ticketData, setTicketData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  // State untuk harga asli sebelum diskon
  const [staffPrice, setStaffPrice] = useState<number | null>(null);
  // State baru untuk menyimpan persentase diskon
  const [staffDiscount, setStaffDiscount] = useState<number>(0);
  // State untuk loading harga
  const [priceLoading, setPriceLoading] = useState(true);

  useEffect(() => {
    const API_BASE_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

    const fetchTicketPrice = async () => {
      try {
        setPriceLoading(true);
        const response = await fetch(`${API_BASE_URL}/ticketing/prices`);
        if (!response.ok) {
          throw new Error("Gagal mengambil data harga.");
        }
        const prices = await response.json();
        const staffPriceData = prices.find(
          (p: { kategori: string }) => p.kategori === "Staff"
        );

        // --- PEMBARUAN LOGIKA FETCH ---
        if (staffPriceData) {
          // Simpan harga asli
          setStaffPrice(staffPriceData.harga);
          // Simpan persentase diskon, default 0 jika tidak ada
          setStaffDiscount(staffPriceData.discountPercentage || 0);
        } else {
          console.error("Harga untuk kategori 'Staff' tidak ditemukan.");
          setStaffPrice(null);
          setStaffDiscount(0);
        }
        // --- AKHIR PEMBARUAN LOGIKA FETCH ---
      } catch (error) {
        console.error("Error fetching ticket price:", error);
        setStaffPrice(null);
        setStaffDiscount(0);
      } finally {
        setPriceLoading(false);
      }
    };

    fetchTicketPrice();
  }, []);

  const formatCurrency = (amount: number | null) => {
    if (amount === null || typeof amount !== "number") return "N/A";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // --- PEMBARUAN PERHITUNGAN HARGA ---
  // Hitung harga setelah diskon
  const discountedPrice =
    staffPrice !== null
      ? staffPrice - (staffPrice * staffDiscount) / 100
      : null;
  // Hitung total pembayaran berdasarkan harga setelah diskon
  const totalPayment =
    discountedPrice !== null ? discountedPrice * ticketCount : 0;

  const handleBackClick = () => {
    router.push("/");
  };

  const handleIncrement = () => {
    setTicketCount((prev) => prev + 1);
  };

  const handleDecrement = () => {
    if (ticketCount > 1) {
      setTicketCount((prev) => prev - 1);
    }
  };

  const handlePurchase = async () => {
    if (!employeeId.trim() || !agreeToTerms) {
      setApiError("Harap lengkapi semua data dengan benar.");
      return;
    }

    setIsLoading(true);
    setApiError(null);

    const backendPaymentMethod = paymentMethod === "cash" ? "Tunai" : "QRIS";

    const payload = {
      No_WhatsApp: employeeId,
      Kuantitas: ticketCount,
      Metode_Pembayaran: backendPaymentMethod,
    };

    try {
      const response = await fetch("http://localhost:3001/ticketing/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Terjadi kesalahan saat memproses tiket."
        );
      }

      // --- PEMBARUAN DATA UNTUK STRUK ---
      // Data yang dikirim ke halaman struk sekarang menggunakan harga setelah diskon
      const dataForReceipt = {
        employeeName: result.data.customerName,
        ticketCount: result.data.Kuantitas,
        ticketPrice: discountedPrice, // Menggunakan harga setelah diskon
        total: totalPayment, // Menggunakan total setelah diskon
        purchaseDate: result.data.createdAt,
        paymentMethod: paymentMethod,
      };

      setTicketData(dataForReceipt);

      if (paymentMethod === "qris") {
        setShowQrisModal(true);
      } else {
        router.push(
          `/Receipt?data=${encodeURIComponent(
            JSON.stringify(dataForReceipt)
          )}&type=employee`
        );
      }
    } catch (error: any) {
      setApiError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  const handlePaymentComplete = () => {
    setShowQrisModal(false);
    router.push(
      `/Receipt?data=${encodeURIComponent(
        JSON.stringify(ticketData)
      )}&type=employee`
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100">
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
              <div className="w-12 h-12 flex items-center justify-center">
                <Image
                  src="/icons/Logo AOPS.png"
                  alt="AOPS Logo"
                  width={48}
                  height={48}
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Tiket Karyawan
                </h1>
                <p className="text-sm text-gray-600">
                  Pembelian tiket khusus karyawan dengan harga spesial
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
                    src="/icons/Tiket Umum Biru.png"
                    alt="Tiket Karyawan"
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>
                <div>
                  <CardTitle className="text-xl">Tiket Karyawan</CardTitle>
                  <CardDescription>
                    Akses lengkap fasilitas dengan harga khusus karyawan
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                {/* --- PEMBARUAN TAMPILAN HARGA --- */}
                <div className="text-3xl font-bold text-blue-600 h-10 flex justify-center items-center">
                  {priceLoading ? (
                    <Loader2 className="w-7 h-7 animate-spin" />
                  ) : (
                    formatCurrency(discountedPrice) // Tampilkan harga setelah diskon
                  )}
                </div>
                {staffDiscount > 0 && staffPrice !== null && (
                  <div className="text-sm text-gray-500">
                    <span className="line-through">
                      {formatCurrency(staffPrice)}
                    </span>
                    <span className="ml-2 font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      Diskon {staffDiscount}%
                    </span>
                  </div>
                )}
                <p className="text-sm text-gray-500 mt-1">Per orang</p>
                {/* --- AKHIR PEMBARUAN TAMPILAN HARGA --- */}
              </div>
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
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <BadgeCheck className="w-4 h-4 text-blue-600" />
                    <h4 className="font-semibold text-blue-800">
                      Syarat Khusus
                    </h4>
                  </div>
                  <p className="text-sm text-blue-700">
                    Wajib menunjukkan ID Karyawan yang valid
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchase Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Pembelian Tiket Karyawan
              </CardTitle>
              <CardDescription>
                Masukkan Nomer Telepon dan pilih jumlah tiket
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="employeeId"
                    className="text-sm font-medium text-gray-700"
                  >
                    Nomer Telepon *
                  </Label>
                  <Input
                    id="employeeId"
                    type="text"
                    placeholder="08xxxx"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    ID Karyawan akan diverifikasi saat masuk
                  </p>
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
                    disabled={ticketCount <= 1}
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
                    className="w-10 h-10 rounded-full bg-transparent"
                  >
                    +
                  </Button>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Harga per tiket</span>
                  <span>{formatCurrency(staffPrice)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Jumlah tiket</span>
                  <span>{ticketCount}x</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-blue-600">
                      {formatCurrency(totalPayment)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  Metode Pembayaran *
                </Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(value) =>
                    setPaymentMethod(value as "cash" | "qris")
                  }
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
                </RadioGroup>
              </div>
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={agreeToTerms}
                    onCheckedChange={handleTermsCheckboxChange}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="terms"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Saya menyetujui syarat dan ketentuan
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Dengan mencentang, saya menyetujui{" "}
                      <a
                        href="#"
                        onClick={() => setShowTermsModal(true)}
                        className="text-blue-600 hover:underline"
                      >
                        syarat dan ketentuan
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </div>
              {apiError && (
                <div className="text-center text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {apiError}
                </div>
              )}
              <Button
                onClick={handlePurchase}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
                size="lg"
                disabled={
                  !employeeId.trim() ||
                  !agreeToTerms ||
                  isLoading ||
                  priceLoading
                }
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-5 h-5 mr-2" />
                )}
                {isLoading
                  ? "Memproses..."
                  : paymentMethod === "qris"
                  ? "Bayar dengan QRIS"
                  : "Beli Tiket Sekarang"}
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
                className="flex-1 bg-blue-600 hover:bg-blue-700"
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
              className="bg-blue-600 hover:bg-blue-700"
            >
              Setuju
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
