"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Ticket, Loader2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function HomePage() {
  const router = useRouter();

  // --- PEMBARUAN STATE HARGA & DISKON ---
  const [priceLoading, setPriceLoading] = useState(true);
  // State untuk menyimpan harga asli sebelum diskon
  const [regularPrice, setRegularPrice] = useState<number | null>(null);
  // State baru untuk menyimpan persentase diskon
  const [regularDiscount, setRegularDiscount] = useState<number>(0);
  // --- AKHIR PEMBARUAN STATE ---

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

        // --- PEMBARUAN LOGIKA FETCH ---
        const regulerPriceData = prices.find(
          (p: { kategori: string }) => p.kategori === "Reguler"
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
        console.error("Error fetching ticket price:", error);
        setRegularPrice(null);
        setRegularDiscount(0);
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
    regularPrice !== null
      ? regularPrice - (regularPrice * regularDiscount) / 100
      : null;
  // --- AKHIR PEMBARUAN PERHITUNGAN HARGA ---

  const handleRegularTicket = () => {
    router.push("/Reguler");
  };

  const handleMemberAccess = () => {
    router.push("/Member");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      {/* Header */}
      <div className="text-center py-12">
        <div className="flex justify-center mb-6">
          <div className="w-40 h-40 flex items-center justify-center">
            <Image
              src="/icons/Logo AOPS.png"
              alt="Assalaam Olympic Pool Stadium"
              width={160}
              height={160}
              className="object-contain"
            />
          </div>
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Let&apos;s Get Wet!
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Nikmati pengalaman berenang dengan fasilitas premium
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 pb-12">
        {/* General Ticket Card */}
        <Card className="hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 mb-8">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-20 h-20 flex items-center justify-center mb-6">
              <Image
                src="/icons/Tiket Umum Hijau.png"
                alt="Tiket Umum"
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
            <CardTitle className="text-3xl text-gray-900 mb-2">
              Tiket Umum
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              Akses penuh ke semua fasilitas kolam renang
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {/* --- PEMBARUAN TAMPILAN HARGA --- */}
            <div className="bg-green-50 p-6 rounded-xl">
              <div className="text-4xl font-bold text-green-600 mb-2 h-12 flex justify-center items-center">
                {priceLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  formatCurrency(discountedPrice) // Tampilkan harga setelah diskon
                )}
              </div>
              {regularDiscount > 0 && regularPrice !== null && (
                <div className="text-base text-gray-500">
                  <span className="line-through">
                    {formatCurrency(regularPrice)}
                  </span>
                  <span className="ml-2 font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-full text-sm">
                    Diskon {regularDiscount}%
                  </span>
                </div>
              )}
              <p className="text-gray-600 mt-1">Per orang</p>
            </div>
            {/* --- AKHIR PEMBARUAN TAMPILAN HARGA --- */}

            <div className="text-sm">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <p className="font-semibold text-gray-800">Jam Buka</p>
                <p className="text-gray-600">06:00 - 21:00</p>
              </div>
            </div>

            <Button
              onClick={handleRegularTicket}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-xl font-semibold"
              size="lg"
              disabled={priceLoading || regularPrice === null}
            >
              <Ticket className="w-6 h-6 mr-3" />
              Beli Tiket Sekarang
            </Button>
          </CardContent>
        </Card>

        {/* Member Access Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Card 1: Masuk Sebagai Member */}
          <Card
            className="hover:shadow-2xl hover:border-blue-300 border-2 border-transparent transition-all duration-300 cursor-pointer flex flex-col justify-between"
            onClick={handleMemberAccess}
          >
            <CardContent className="p-6 flex flex-col h-full justify-between items-center text-center space-y-4">
              <div className="w-16 h-16 flex items-center justify-center bg-blue-50 rounded-full p-3 mt-2">
                <Image
                  src="/icons/Member Umum.png"
                  alt="Member Access"
                  width={64}
                  height={64}
                  className="object-contain"
                />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-gray-900">
                  Masuk Member
                </h3>
                <p className="text-sm text-gray-500 px-2">
                  Akses kolam renang khusus PPMI, Santri, dan Member.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full border-blue-600 text-blue-600 hover:bg-blue-50 bg-transparent py-5 font-semibold"
              >
                Masuk Sekarang
              </Button>
            </CardContent>
          </Card>

          {/* Card 2: Top Up Kartu Member */}
          <Card
            className="hover:shadow-2xl hover:border-indigo-300 border-2 border-transparent transition-all duration-300 cursor-pointer flex flex-col justify-between"
            onClick={() => router.push("/Topup")}
          >
            <CardContent className="p-6 flex flex-col h-full justify-between items-center text-center space-y-4">
              <div className="w-16 h-16 flex items-center justify-center bg-indigo-50 rounded-full p-4 mt-2">
                <Wallet className="w-10 h-10 text-indigo-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-gray-900">
                  Top Up Saldo
                </h3>
                <p className="text-sm text-gray-500 px-2">
                  Isi ulang saldo kartu member Anda untuk kemudahan transaksi.
                </p>
              </div>
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 font-semibold"
              >
                Top Up Sekarang
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 mb-4">
            Fasilitas: Kolam Olympic • Shower • Parkir • Meeting Room • Cafe • Workout Space 
          </p>
          <p className="text-xs text-gray-400">
            Tiket berlaku untuk hari pembelian • Tidak dapat dikembalikan
          </p>
        </div>
      </div>
    </div>
  );
}
