'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, Users, CreditCard, Clock, BadgeCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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

export default function KaryawanPage() {
  const router = useRouter();
  const [ticketCount, setTicketCount] = useState(1);
  const ticketPrice = 15000; // Discounted price for employees
  const [visitorName, setVisitorName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(''); // Added phone number state
  const [employeeId, setEmployeeId] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('cash');
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false); // Added terms modal state
  const [ticketData, setTicketData] = useState<any>(null);

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

  const handlePurchase = () => {
    if (!visitorName.trim()) {
      alert('Nama karyawan harus diisi!');
      return;
    }
    if (!phoneNumber.trim()) {
      alert('Nomor telepon harus diisi!');
      return;
    }
    if (!validatePhoneNumber(phoneNumber)) {
      alert('Format nomor telepon tidak valid!');
      return;
    }
    if (!employeeId.trim()) {
      alert('ID Karyawan harus diisi!');
      return;
    }
    if (!agreeToTerms) {
      alert('Anda harus menyetujui syarat dan ketentuan!');
      return;
    }

    const data = {
      visitorName,
      phoneNumber,
      employeeId,
      ticketCount,
      ticketPrice,
      total: ticketPrice * ticketCount,
      purchaseDate: new Date().toISOString(),
      type: 'employee',
      paymentMethod,
    };

    setTicketData(data);

    if (paymentMethod === 'qris') {
      setShowQrisModal(true);
    } else {
      // Route directly to receipt for cash payment
      router.push(`/Receipt?data=${encodeURIComponent(JSON.stringify(data))}`);
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
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <BadgeCheck className="h-6 w-6 text-green-600" />
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
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <BadgeCheck className="w-6 h-6 text-green-600" />
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
                <p className="text-3xl font-bold text-green-600">
                  Rp {ticketPrice.toLocaleString('id-ID')}
                </p>
                <p className="text-sm text-gray-500">Per orang</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <p className="text-xs text-red-500 line-through">Rp 25.000</p>
                  <p className="text-xs text-green-600 font-medium">
                    Diskon 40%
                  </p>
                </div>
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
                Masukkan data karyawan dan pilih jumlah tiket
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Employee Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="visitorName"
                    className="text-sm font-medium text-gray-700"
                  >
                    Nama Karyawan *
                  </Label>
                  <Input
                    id="visitorName"
                    type="text"
                    placeholder="Masukkan nama lengkap"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    className="w-full"
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
                    htmlFor="employeeId"
                    className="text-sm font-medium text-gray-700"
                  >
                    ID Karyawan *
                  </Label>
                  <Input
                    id="employeeId"
                    type="text"
                    placeholder="Masukkan ID Karyawan"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    ID Karyawan akan diverifikasi saat masuk
                  </p>
                </div>
              </div>

              {/* Ticket Counter */}
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
                <p className="text-xs text-gray-500 text-center">
                  {ticketCount === 1 ? '1 orang' : `${ticketCount} orang`}
                </p>
              </div>

              {/* Price Summary */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Harga per tiket</span>
                  <span>Rp {ticketPrice.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Jumlah tiket</span>
                  <span>{ticketCount}x</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Diskon karyawan</span>
                  <span>-40%</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-green-600">
                      Rp {(ticketPrice * ticketCount).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  Metode Pembayaran *
                </Label>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(value) =>
                    setPaymentMethod(value as 'cash' | 'qris')
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

              {/* Terms and Conditions */}
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={agreeToTerms}
                    onCheckedChange={handleTermsCheckboxChange} // Modified handler
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="terms"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Saya menyetujui syarat dan ketentuan
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Dengan mencentang kotak ini, saya menyetujui{' '}
                      <a
                        href="#"
                        onClick={() => setShowTermsModal(true)}
                        className="text-green-600 hover:underline"
                      >
                        syarat dan ketentuan
                      </a>{' '}
                      khusus untuk karyawan dan penggunaan fasilitas kolam
                      renang.
                    </p>
                  </div>
                </div>
              </div>

              {/* Purchase Button */}
              <Button
                onClick={handlePurchase}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg"
                size="lg"
                disabled={
                  !visitorName.trim() ||
                  !phoneNumber.trim() ||
                  !validatePhoneNumber(phoneNumber) ||
                  !employeeId.trim() ||
                  !agreeToTerms
                }
              >
                <CreditCard className="w-5 h-5 mr-2" />
                {paymentMethod === 'qris'
                  ? 'Bayar dengan QRIS'
                  : 'Beli Tiket Sekarang'}
              </Button>

              {/* Additional Info */}
              <div className="text-xs text-gray-500 text-center space-y-1">
                <p>* Wajib diisi</p>
                <p>Tiket berlaku untuk hari ini</p>
                <p>Wajib menunjukkan ID Karyawan saat masuk</p>
                <p>Tidak dapat dikembalikan setelah pembelian</p>
              </div>
            </CardContent>
          </Card>
        </div>
        g{' '}
      </div>

      {/* QRIS Payment Modal */}
      <Dialog open={showQrisModal} onOpenChange={setShowQrisModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Pembayaran QRIS</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-6 py-4">
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900">
                Total: Rp {ticketData?.total?.toLocaleString('id-ID')}
              </p>
              <p className="text-sm text-gray-600">
                Scan QR Code untuk membayar
              </p>
            </div>

            {/* QR Code - Replace with your QR code image */}
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
              <img
                src="/placeholder.svg?height=250&width=250"
                alt="QR Code QRIS"
                className="w-64 h-64 object-contain"
              />
            </div>

            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Gunakan aplikasi mobile banking atau e-wallet
              </p>
              <p className="text-xs text-gray-500">
                Setelah pembayaran berhasil, klik tombol "Selesai" di bawah
              </p>
            </div>

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

      {/* Terms and Conditions Modal */}
      <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-center">
              Peraturan Kolam Renang
            </DialogTitle>
            <DialogDescription className="text-center">
              (Swimming Pool Regulations)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-gray-700">
            <p>1. Tamu diharuskan untuk memakai pakaian renang yang pantas</p>
            <p className="text-xs text-gray-500">
              (Please wearing a proper swimsuit)
            </p>
            <p>2. Dilarang membawa makanan dan minuman dari luar</p>
            <p className="text-xs text-gray-500">
              (Bringing food and beverage from the outside is not allowed)
            </p>
            <p>
              3. Anak di bawah 12 tahun diawasi oleh orang tua atau pengasuh
              setiap waktu
            </p>
            <p className="text-xs text-gray-500">
              (Children under 12 should be accompanied at all time)
            </p>
            <p>4. Bilas badan sebelum masuk kolam</p>
            <p className="text-xs text-gray-500">
              (Shower before entering the pool)
            </p>
            <p>5. Tidak ada petugas life guard</p>
            <p className="text-xs text-gray-500">(No life guard on duty)</p>
            <p>
              6. Manajemen tidak bertanggung jawab atas kehilangan, kerusakan,
              cedera, atau kematian yang timbul dari penyebab apapun
            </p>
            <p className="text-xs text-gray-500">
              (The management shall not be held liable for any loss, damage,
              injury, or death arising from any cause)
            </p>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
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
    </div>
  );
}
