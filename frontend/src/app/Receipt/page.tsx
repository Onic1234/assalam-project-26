'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download, CheckCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';

// Existing interfaces for swimming tickets
interface TicketData {
  visitorName: string;
  phoneNumber: string;
  ticketCount: number;
  ticketPrice: number;
  total: number;
  purchaseDate: string;
  email?: string;
}

interface EmployeeData {
  employeeName: string;
  ticketCount: number;
  ticketPrice: number;
  total: number;
  purchaseDate: string;
}

interface FaceIdData {
  memberType: 'santri' | 'non-santri';
  memberName: string;
  accessDate: string;
  accessType: string;
  price: number;
  total: number;
}

// New interface for product purchase receipt
interface ProductItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

interface ProductPurchaseData {
  studentName: string;
  studentId: string;
  items: ProductItem[];
  totalAmount: number;
  newBalance: number;
  purchaseDate: string;
  transactionId: string;
}

// Unified Receipt Data Type
type UnifiedReceiptData =
  | TicketData
  | EmployeeData
  | FaceIdData
  | ProductPurchaseData;

export default function ReceiptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [receiptData, setReceiptData] = useState<UnifiedReceiptData | null>(
    null
  );
  const [receiptType, setReceiptType] = useState<
    'regular' | 'employee' | 'faceid' | 'product_purchase'
  >('regular');
  const [accessNumber, setAccessNumber] = useState(''); // Used for ticket/access receipts
  const [receiptNumber, setReceiptNumber] = useState(''); // Used for product purchase receipts

  useEffect(() => {
    const dataParam = searchParams.get('data');
    const typeParam = searchParams.get('type') as
      | 'regular'
      | 'employee'
      | 'faceid'
      | 'product_purchase'
      | null;

    if (dataParam) {
      try {
        const data = JSON.parse(decodeURIComponent(dataParam));
        setReceiptData(data);
        setReceiptType(typeParam || 'regular');

        if (typeParam === 'product_purchase') {
          setReceiptNumber(
            (data as ProductPurchaseData).transactionId ||
              `RCP-${Date.now().toString().slice(-8)}`
          );
        } else {
          const accessNum =
            typeParam === 'faceid'
              ? `ACC-${Date.now().toString().slice(-8)}`
              : `TKT-${Date.now().toString().slice(-8)}`;
          setAccessNumber(accessNum);
        }
      } catch (error) {
        console.error('Error parsing receipt data:', error);
        router.push('/dashboard');
      }
    } else {
      router.push('/dashboard');
    }
  }, [searchParams, router]);

  const handleBackToHome = () => {
    const sourceParam = searchParams.get('source');
    if (receiptType === 'product_purchase' && sourceParam === 'kasir') {
      router.push('/Kasir');
    } else if (receiptType === 'product_purchase') {
      router.push('/dashboard');
    } else {
      router.push('/');
    }
  };

  const handlePrintReceipt = () => {
    const printContents =
      document.getElementById('receipt-to-print')?.innerHTML;

    if (printContents) {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <html>
            <head>
              <title>Print Struk</title>
              <style>
                @page { size: 58mm auto; margin: 0; }
                body {
                  margin: 2mm;
                  font-family: 'Courier New', monospace;
                  font-size: 9pt;
                  line-height: 1.3;
                }
                * {
                  font-family: 'Courier New', monospace !important;
                  color: #000 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .text-lg { font-size: 11pt !important; font-weight: bold; }
                .text-sm { font-size: 9pt !important; }
                .text-xs { font-size: 8pt !important; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .flex { display: flex; }
                .justify-between { justify-content: space-between; }
                .font-bold { font-weight: bold; }
                .font-semibold { font-weight: 600; }
                .border-b { border-bottom: 1px dashed #999; }
                .border-t { border-top: 1px dashed #999; }
                .mt-1 { margin-top: 4px; }
                .mb-1 { margin-bottom: 4px; }
                .py-1 { padding-top: 4px; padding-bottom: 4px; }
                .pb-2 { padding-bottom: 8px; }
                img {
                  max-width: 25mm !important;
                  height: auto !important;
                  display: block !important;
                  margin-left: auto !important;
                  margin-right: auto !important;
                  visibility: visible !important;
                }
                .print-section {
                    padding-bottom: 1.5mm !important;
                    margin-bottom: 1.5mm !important;
                }
              </style>
            </head>
            <body>
              ${printContents}
            </body>
          </html>
        `);
        doc.close();

        iframe.onload = function () {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          document.body.removeChild(iframe);
        };

        setTimeout(() => {
          if (iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            document.body.removeChild(iframe);
          }
        }, 500);
      }
    }
  };

  if (!receiptData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat struk...</p>
        </div>
      </div>
    );
  }

  // --- COMPACT RENDER FUNCTIONS ---

  const renderFaceIdReceipt = (data: FaceIdData) => (
    <>
      <div className="text-center pb-2 border-b print-section">
        <p className="text-xs text-gray-500">Tanggal & Waktu Akses</p>
        <p className="font-semibold text-sm">
          {new Date(data.accessDate).toLocaleDateString('id-ID')}{' '}
          {new Date(data.accessDate).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      <div className="space-y-1 pb-2 border-b print-section">
        <h3 className="font-semibold text-gray-800 text-sm mb-1">
          INFORMASI MEMBER
        </h3>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Nama</span>
          <span className="font-semibold">{data.memberName}</span>
        </div>
        {/* <div className="flex justify-between text-xs">
          <span className="text-gray-600">Tipe</span>
          <span className="font-semibold">
            {data.memberType === 'santri' ? 'Santri' : 'Member Umum'}
          </span>
        </div> */}
        {/* <div className="flex justify-between text-xs">
          <span className="text-gray-600">Akses</span>
          <span className="font-semibold">{data.accessType}</span>
        </div> */}
      </div>

      <div className="space-y-1 pb-2 border-b print-section">
        <div className="flex justify-between text-sm">
          <span className="font-bold">Biaya Akses</span>
          <span className="font-bold text-green-600">GRATIS</span>
        </div>
      </div>
    </>
  );

  const renderEmployeeReceipt = (data: EmployeeData) => (
    <>
      <div className="text-center pb-2 border-b print-section">
        <p className="text-xs text-gray-500">Tanggal & Waktu Pembelian</p>
        <p className="font-semibold text-sm">
          {new Date(data.purchaseDate).toLocaleDateString('id-ID')}{' '}
          {new Date(data.purchaseDate).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      <div className="space-y-1 pb-2 border-b print-section">
        <h3 className="font-semibold text-gray-800 text-sm mb-1">
          INFORMASI KARYAWAN
        </h3>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Nama Karyawan</span>
          <span className="font-semibold">{data.employeeName}</span>
        </div>
      </div>

      <div className="space-y-1 pb-2 border-b print-section">
        <h3 className="font-semibold text-gray-800 text-sm mb-1">
          DETAIL TIKET
        </h3>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Jenis Tiket</span>
          <span className="font-semibold">Karyawan</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Jumlah</span>
          <span className="font-semibold">{data.ticketCount} tiket</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Harga Satuan</span>
          <span className="font-semibold">
            Rp {data.ticketPrice.toLocaleString('id-ID')}
          </span>
        </div>
        <div className="border-t my-1"></div>
        <div className="flex justify-between text-sm">
          <span className="font-bold">Total</span>
          <span className="font-bold text-blue-600">
            Rp {data.total.toLocaleString('id-ID')}
          </span>
        </div>
      </div>
    </>
  );

  const renderRegularReceipt = (data: TicketData) => (
    <>
      <div className="text-center pb-2 border-b print-section">
        <p className="text-xs text-gray-500">Tanggal & Waktu Pembelian</p>
        <p className="font-semibold text-sm">
          {new Date(data.purchaseDate).toLocaleDateString('id-ID')}{' '}
          {new Date(data.purchaseDate).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      <div className="space-y-1 pb-2 border-b print-section">
        <h3 className="font-semibold text-gray-800 text-sm mb-1">
          INFORMASI PENGUNJUNG
        </h3>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Nama</span>
          <span className="font-semibold">{data.visitorName}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">No. Telepon</span>
          <span className="font-semibold">{data.phoneNumber}</span>
        </div>
        {data.email && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Email</span>
            <span className="font-semibold">{data.email}</span>
          </div>
        )}
      </div>

      <div className="space-y-1 pb-2 border-b print-section">
        <h3 className="font-semibold text-gray-800 text-sm mb-1">
          DETAIL TIKET
        </h3>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Jenis Tiket</span>
          <span className="font-semibold">Reguler</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Jumlah</span>
          <span className="font-semibold">{data.ticketCount} tiket</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-600">Harga Satuan</span>
          <span className="font-semibold">
            Rp {data.ticketPrice.toLocaleString('id-ID')}
          </span>
        </div>
        <div className="border-t mt-1 mb-1"></div>
        <div className="flex justify-between text-sm">
          <span className="font-bold">Total</span>
          <span className="font-bold text-blue-600">
            Rp {data.total.toLocaleString('id-ID')}
          </span>
        </div>
      </div>
    </>
  );

  const renderProductPurchaseReceipt = (data: ProductPurchaseData) => (
    <>
      <div className="text-center pb-2 border-b print-section">
        <p className="text-xs text-gray-500">Tanggal & Waktu Pembelian</p>
        <p className="font-semibold text-sm">
          {new Date(data.purchaseDate).toLocaleDateString('id-ID')}{' '}
          {new Date(data.purchaseDate).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {data.studentId !== 'kasir' && (
        <div className="space-y-1 pb-2 border-b print-section">
          <h3 className="font-semibold text-gray-800 text-sm mb-1">
            INFORMASI SISWA
          </h3>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Nama</span>
            <span className="font-semibold">{data.studentName}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">ID Siswa</span>
            <span className="font-semibold">{data.studentId}</span>
          </div>
        </div>
      )}

      {data.studentId === 'kasir' && (
        <div className="space-y-1 pb-2 border-b print-section">
          <h3 className="font-semibold text-gray-800 text-sm mb-1">
            INFORMASI TRANSAKSI
          </h3>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Kasir</span>
            <span className="font-semibold">{data.studentName}</span>
          </div>
        </div>
      )}

      <div className="space-y-1 pb-2 border-b print-section">
        <h3 className="font-semibold text-gray-800 text-sm mb-1">
          DETAIL BARANG
        </h3>
        {data.items.map((item, index) => (
          <div key={index} className="text-xs">
            <p className="font-semibold">{item.name}</p>
            <div className="flex justify-between">
              <span>
                {item.quantity} x Rp {item.price.toLocaleString('id-ID')}
              </span>
              <span className="font-semibold">
                Rp {(item.price * item.quantity).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <div className="border-t mt-1 mb-1"></div>
        <div className="flex justify-between text-sm">
          <span className="font-bold">Total Belanja</span>
          <span className="font-bold">
            Rp {data.totalAmount.toLocaleString('id-ID')}
          </span>
        </div>
        {data.studentId !== 'kasir' && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Sisa Saldo</span>
            <span className="font-semibold text-green-600">
              Rp {data.newBalance.toLocaleString('id-ID')}
            </span>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToHome}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                {receiptType === 'product_purchase' &&
                searchParams.get('source') === 'kasir'
                  ? 'Kembali ke Kasir'
                  : receiptType === 'product_purchase'
                  ? 'Kembali ke Dashboard'
                  : 'Kembali ke Beranda'}
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {receiptType === 'faceid'
                      ? 'Akses Berhasil!'
                      : 'Pembelian Berhasil!'}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {receiptType === 'faceid'
                      ? 'Struk akses kolam renang'
                      : receiptType === 'product_purchase'
                      ? 'Struk pembelian produk'
                      : 'Struk tiket kolam renang'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {/* Tombol Print hanya akan muncul jika BUKAN akses santri */}
              {!(
                receiptType === 'faceid' &&
                (receiptData as FaceIdData)?.memberType === 'santri'
              ) && (
                <Button
                  variant="outline"
                  onClick={handlePrintReceipt}
                  className="flex items-center gap-2 bg-transparent"
                >
                  <Download className="h-4 w-4" />
                  Print
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 print:max-w-none print:px-0 print:py-0">
        <Card
          id="receipt-to-print"
          className="shadow-lg print:shadow-none print:border-none"
        >
          <CardHeader className="text-center border-b print:pb-2">
            <div className="w-20 h-20 flex items-center justify-center mx-auto mb-2 print:w-16 print:h-16 print:mb-1">
              <Image
                src="/icons/Logo AOPS.png"
                alt="AOPS Logo"
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
            <CardTitle className="text-lg font-bold text-gray-900 print:text-sm">
              {receiptType === 'faceid'
                ? 'STRUK AKSES'
                : receiptType === 'product_purchase'
                ? 'STRUK PEMBELIAN'
                : 'STRUK TIKET'}
            </CardTitle>
            <p className="text-sm font-semibold text-green-600 print:text-xs">
              {receiptType === 'product_purchase'
                ? 'School Canteen System'
                : 'Assalaam Olympic Pool'}
            </p>
            <div className="bg-green-50 px-3 py-2 rounded mt-3 print:px-2 print:py-1 print:mt-2 print:rounded-none print:bg-white print:border">
              <p className="text-xs text-gray-600">
                {receiptType === 'faceid'
                  ? 'Nomor Akses'
                  : receiptType === 'product_purchase'
                  ? 'Nomor Struk'
                  : 'Nomor Tiket'}
              </p>
              <p className="text-lg font-bold text-green-700 print:text-sm">
                {receiptType === 'product_purchase'
                  ? receiptNumber
                  : accessNumber}
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 p-4 print:space-y-2 print:p-2">
            {receiptType === 'faceid' &&
              renderFaceIdReceipt(receiptData as FaceIdData)}
            {receiptType === 'employee' &&
              renderEmployeeReceipt(receiptData as EmployeeData)}
            {receiptType === 'regular' &&
              renderRegularReceipt(receiptData as TicketData)}
            {receiptType === 'product_purchase' &&
              renderProductPurchaseReceipt(receiptData as ProductPurchaseData)}

            <div className="text-center pt-3 border-t print:pt-2">
              <p className="text-xs text-gray-500">Terima kasih!</p>
              <p className="text-xs text-gray-400 mt-1">
                {receiptType === 'product_purchase'
                  ? 'School Canteen System © 2025'
                  : 'Assalaam Olympic Pool © 2025'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }

          #receipt-to-print,
          #receipt-to-print * {
            visibility: visible;
          }

          .print\\:hidden {
            display: none !important;
          }

          @page {
            size: 57mm auto;
            margin: 0;
          }

          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .max-w-2xl {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 57mm !important;
            margin: 0 !important;
            padding: 2mm !important; /* Padding for the whole receipt */
            box-sizing: border-box !important;
          }

          #receipt-to-print {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }

          /* Typography */
          .text-lg {
            font-size: 11pt !important;
            font-weight: bold !important;
          }
          .text-sm {
            font-size: 9pt !important;
          }
          .text-xs {
            font-size: 8pt !important;
          }
          .font-bold {
            font-weight: bold !important;
          }

          /* Sections */
          .print-section {
            margin-bottom: 1.5mm !important;
            padding-bottom: 1.5mm !important;
            border-bottom: 1px dashed #999 !important;
          }
          .border-t {
            border-top: 1px dashed #999 !important;
            padding-top: 1mm !important;
            margin-top: 1mm !important;
          }
          .space-y-1 > * + * {
            margin-top: 0.5mm !important;
          }
          .flex {
            display: flex !important;
          }
          .justify-between {
            justify-content: space-between !important;
          }
          .text-center {
            text-align: center !important;
          }

          /* Colors */
          .text-green-600,
          .text-green-700,
          .text-blue-600 {
            color: #000 !important;
            font-weight: bold !important;
          }
          .text-gray-500,
          .text-gray-600,
          .text-gray-400 {
            color: #666 !important;
          }
          .bg-green-50,
          .bg-blue-50,
          .bg-gradient-to-br {
            background: white !important;
          }

          img {
            max-width: 18mm !important;
            height: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
