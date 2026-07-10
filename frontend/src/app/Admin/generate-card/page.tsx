'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Printer, Loader2, Sparkles, CheckCircle2, Download } from 'lucide-react';

interface GeneratedMember {
  id: number;
  id_member: string;
  Nama: string;
  Jenis_Member: string;
}

export default function GenerateCardPage() {
  const [count, setCount] = useState<number>(5);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCards, setGeneratedCards] = useState<GeneratedMember[]>([]);
  const [allBlankCards, setAllBlankCards] = useState<GeneratedMember[]>([]);
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  const fetchBlankCards = async () => {
    setIsLoadingAll(true);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/customers/member`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Saring member yang memiliki nama "Kartu Kosong"
        const blankCards = data.filter((m: any) => m.Nama === 'Kartu Kosong');
        setAllBlankCards(blankCards);
      }
    } catch (error) {
      console.error('Error fetching blank cards:', error);
    } finally {
      setIsLoadingAll(false);
    }
  };

  useEffect(() => {
    fetchBlankCards();
  }, []);

  const handleExportCSV = (cards: GeneratedMember[], filename = 'daftar-kartu-member-kosong.csv') => {
    if (cards.length === 0) {
      toast({
        title: 'Ekspor Gagal',
        description: 'Tidak ada data kartu untuk diekspor.',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['No', 'ID Member', 'Nama', 'Jenis Member'];
    const rows = cards.map((card, index) => [
      index + 1,
      card.id_member,
      card.Nama,
      card.Jenis_Member
    ]);

    // Format CSV dengan pemisah koma dan kutip ganda
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((val) => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Ekspor Berhasil',
      description: `File ${filename} berhasil diunduh.`,
    });
  };

  const handleGenerate = async () => {
    if (count < 1 || count > 100) {
      toast({
        title: 'Error',
        description: 'Jumlah kartu yang dibuat harus antara 1 sampai 100.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/customers/member/bulk-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          count,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Gagal memproses pembuatan kartu.');
      }

      setGeneratedCards(result.data || []);
      fetchBlankCards();
      toast({
        title: 'Sukses',
        description: `${result.data?.length || count} Kartu member baru berhasil dibuat!`,
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: 'Gagal',
        description: error.message || 'Terjadi kesalahan saat memproses pembuatan kartu.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintAll = () => {
    if (generatedCards.length === 0) return;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();

      let cardsHtml = '';
      generatedCards.forEach((card) => {
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(card.id_member)}`;
        cardsHtml += `
          <div class="card">
            <div class="card-header">
              <div>
                <div class="logo-text">ASSALAM</div>
                <div class="logo-sub">Olympic Pool Stadium</div>
              </div>
              <div class="card-type">MEMBER</div>
            </div>
            <div class="card-body">
              <div class="info-section">
                <div class="info-group">
                  <span class="info-label">ID Kartu Member</span>
                  <span class="info-value id-val">${card.id_member}</span>
                </div>
              </div>
              <div class="qr-section">
                <img class="qr-image" src="${qrCodeUrl}" alt="QR" />
              </div>
            </div>
            <div class="card-footer">
              <span class="footer-text">AKTIF / SEUMUR HIDUP</span>
              <span class="footer-text" style="font-weight:bold;">MEMBER CARD</span>
            </div>
          </div>
        `;
      });

      doc.write(`
        <html>
          <head>
            <title>Cetak Kartu Member Massal</title>
            <style>
              @page {
                size: 85.6mm 53.98mm;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .card {
                width: 85.6mm;
                height: 53.98mm;
                page-break-after: always;
                break-after: page;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                position: relative;
                overflow: hidden;
                border: 0.5px solid #cbd5e1;
                background: #ffffff;
                color: #1e1b4b;
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              }
              .card-header {
                padding: 3.5mm 4mm 2mm 4mm;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #e2e8f0;
                background: #f8fafc;
              }
              .logo-text {
                font-size: 3.8mm;
                font-weight: 800;
                letter-spacing: 0.5px;
                color: #1e1b4b;
              }
              .logo-sub {
                font-size: 1.8mm;
                text-transform: uppercase;
                color: #4f46e5;
                font-weight: bold;
              }
              .card-type {
                font-size: 2.2mm;
                background: #4f46e5;
                color: #ffffff;
                padding: 0.5mm 2mm;
                border-radius: 0.8mm;
                font-weight: 800;
                text-transform: uppercase;
              }
              .card-body {
                padding: 2mm 4mm;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-grow: 1;
                background: #ffffff;
              }
              .info-section {
                display: flex;
                flex-direction: column;
                gap: 2mm;
                max-width: 52mm;
              }
              .info-group {
                display: flex;
                flex-direction: column;
              }
              .info-label {
                font-size: 1.8mm;
                color: #4f46e5;
                text-transform: uppercase;
                font-weight: 600;
              }
              .info-value {
                font-size: 3.5mm;
                font-weight: 700;
                color: #0f172a;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .info-value.id-val {
                font-family: monospace;
                letter-spacing: 0.5px;
                color: #334155;
              }
              .qr-section {
                width: 16mm;
                height: 16mm;
                background: white;
                padding: 0.8mm;
                border-radius: 1mm;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid #e2e8f0;
              }
              .qr-image {
                width: 100%;
                height: 100%;
              }
              .card-footer {
                padding: 2mm 4mm 2.5mm 4mm;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: #f8fafc;
                border-top: 1px solid #e2e8f0;
              }
              .footer-text {
                font-size: 1.8mm;
                color: #475569;
                font-weight: 500;
              }
            </style>
          </head>
          <body>
            ${cardsHtml}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  setTimeout(function() {
                    window.frameElement.parentNode.removeChild(window.frameElement);
                  }, 500);
                }, 1000);
              };
            </script>
          </body>
        </html>
      `);
      doc.close();
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/Admin">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Generate Kartu Member</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>

        <main className="flex-1 space-y-6 p-8 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Generate Kartu Member</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Buat dan cetak kartu member kosong secara massal dengan nomor ID otomatis.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Form Generate */}
            <Card className="md:col-span-1 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Kustomisasi Kartu</CardTitle>
                <CardDescription>Tentukan jumlah kartu member kosong yang ingin dibuat</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="count">Jumlah Kartu</Label>
                  <Input
                    id="count"
                    type="number"
                    min={1}
                    max={100}
                    value={count}
                    onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={isLoading}
                  />
                  <div className="flex gap-2 mt-1.5">
                    {[10, 25, 50].map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCount(preset)}
                        disabled={isLoading}
                        className={`flex-1 text-xs border-dashed ${count === preset ? 'border-indigo-600 bg-indigo-50 text-indigo-700 hover:bg-indigo-50' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        {preset} Kartu
                      </Button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Membuat Kartu...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate ID Baru
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* List Preview */}
            <Card className="md:col-span-2 shadow-sm flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-lg">Hasil Pembuatan Kartu</CardTitle>
                  <CardDescription>Tinjau dan cetak kartu kosong yang baru saja dibuat</CardDescription>
                </div>
                {generatedCards.length > 0 && (
                  <Button
                    onClick={handlePrintAll}
                    variant="outline"
                    className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Cetak Semua Kartu ({generatedCards.length})
                  </Button>
                )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                {generatedCards.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-400 border-2 border-dashed rounded-lg border-slate-200">
                    <CreditCard className="h-12 w-12 text-slate-300 mb-3 animate-pulse" />
                    <p className="text-sm font-medium">Belum ada kartu yang dibuat</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Gunakan formulir di sebelah kiri untuk men-generate kartu baru.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>{generatedCards.length} kartu berhasil terdaftar di database sebagai "Kartu Kosong".</span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4 max-h-[450px] overflow-y-auto pr-2 py-1">
                      {generatedCards.map((card) => (
                        <div
                          key={card.id}
                          className="border border-slate-200 rounded-lg p-4 bg-white shadow-sm flex flex-col justify-between h-[120px] hover:border-indigo-300 transition-all duration-300"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded">
                                MEMBER
                              </span>
                              <h3 className="font-mono text-sm font-bold text-slate-800 mt-2">{card.id_member}</h3>
                            </div>
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(card.id_member)}`}
                              alt="QR"
                              className="w-10 h-10 border p-0.5 bg-white rounded"
                            />
                          </div>
                          <div className="text-[10px] text-slate-400 flex justify-between border-t pt-1.5 mt-2">
                            <span>AKTIF / SEUMUR HIDUP</span>
                            <span className="font-bold text-slate-500 uppercase">Blank Card</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Database Blank Cards List */}
            <Card className="md:col-span-3 shadow-sm mt-6">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b">
                <div>
                  <CardTitle className="text-lg font-bold">Database Semua Kartu Kosong</CardTitle>
                  <CardDescription>
                    Total {allBlankCards.length} kartu kosong tersimpan di database yang siap digunakan / diekspor
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleExportCSV(allBlankCards, 'semua-kartu-member-kosong.csv')}
                    variant="outline"
                    className="border-slate-300 text-slate-700 hover:bg-slate-50"
                    disabled={allBlankCards.length === 0}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Ekspor CSV (Excel)
                  </Button>
                  <Button
                    onClick={() => {
                      if (allBlankCards.length === 0) return;
                      const iframe = document.createElement('iframe');
                      iframe.style.position = 'absolute';
                      iframe.style.width = '0';
                      iframe.style.height = '0';
                      iframe.style.border = '0';
                      document.body.appendChild(iframe);
                      const doc = iframe.contentWindow?.document;
                      if (doc) {
                        doc.open();
                        let cardsHtml = '';
                        allBlankCards.forEach((card) => {
                          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(card.id_member)}`;
                          cardsHtml += `
                            <div class="card">
                              <div class="card-header">
                                <div>
                                  <div class="logo-text">ASSALAM</div>
                                  <div class="logo-sub">Olympic Pool Stadium</div>
                                </div>
                                <div class="card-type">MEMBER</div>
                              </div>
                              <div class="card-body">
                                <div class="info-section">
                                  <div class="info-group">
                                    <span class="info-label">ID Kartu Member</span>
                                    <span class="info-value id-val">${card.id_member}</span>
                                  </div>
                                </div>
                                <div class="qr-section">
                                  <img class="qr-image" src="${qrCodeUrl}" alt="QR" />
                                </div>
                              </div>
                              <div class="card-footer">
                                <span>STATUS: Blank Card</span>
                                <span>Masa Berlaku: Aktif Selamanya</span>
                              </div>
                            </div>
                          `;
                        });
                        doc.write(`
                          <html>
                            <head>
                              <title>Cetak Semua Kartu Kosong</title>
                              <style>
                                @page { size: A4; margin: 10mm; }
                                body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; background: white; }
                                .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
                                .card { border: 1.5px solid #2563eb; border-radius: 12px; padding: 16px; height: 260px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%); position: relative; overflow: hidden; page-break-inside: avoid; }
                                .card-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
                                .logo-text { font-size: 20px; font-weight: 800; color: #1e3a8a; letter-spacing: 1px; }
                                .logo-sub { font-size: 10px; color: #3b82f6; font-weight: 600; }
                                .card-type { font-size: 12px; font-weight: 700; background: #2563eb; color: white; padding: 3px 8px; rounded: 4px; border-radius: 4px; }
                                .card-body { display: flex; justify-content: space-between; align-items: center; flex: 1; padding: 12px 0; }
                                .info-section { display: flex; flex-direction: column; gap: 8px; }
                                .info-group { display: flex; flex-direction: column; }
                                .info-label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600; }
                                .info-value { font-size: 14px; font-weight: 700; color: #1e293b; }
                                .id-val { font-family: monospace; font-size: 16px; color: #2563eb; }
                                .qr-section { width: 90px; height: 90px; border: 1px solid #e2e8f0; padding: 4px; background: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
                                .qr-image { width: 100%; height: 100%; object-fit: contain; }
                                .card-footer { border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; font-weight: 500; }
                              </style>
                            </head>
                            <body>
                              <div class="grid">
                                ${cardsHtml}
                              </div>
                              <script>
                                window.onload = function() {
                                  window.print();
                                  setTimeout(function() { window.frameElement.remove(); }, 100);
                                };
                              </script>
                            </body>
                          </html>
                        `);
                        doc.close();
                      }
                    }}
                    variant="outline"
                    className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                    disabled={allBlankCards.length === 0}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Cetak Semua Kartu Kosong
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {isLoadingAll ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  </div>
                ) : allBlankCards.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    Belum ada database kartu kosong yang terdaftar.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4 max-h-[300px] overflow-y-auto pr-2">
                    {allBlankCards.map((card) => (
                      <div
                        key={card.id}
                        className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex flex-col justify-between h-[100px] hover:border-indigo-300 transition-all duration-300"
                      >
                        <div>
                          <span className="text-[8px] font-bold text-slate-500 uppercase bg-slate-200 px-1.5 py-0.5 rounded">
                            ID MEMBER
                          </span>
                          <h4 className="font-mono text-xs font-bold text-slate-700 mt-2">{card.id_member}</h4>
                        </div>
                        <div className="flex justify-between items-center border-t pt-1 mt-1 text-[8px] text-slate-400">
                          <span>READY</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 text-indigo-600 hover:bg-indigo-100"
                            onClick={() => handleExportCSV([card], `kartu-${card.id_member}.csv`)}
                            title="Ekspor CSV Kartu Ini"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
