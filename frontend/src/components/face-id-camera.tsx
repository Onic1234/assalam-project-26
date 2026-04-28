'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Camera,
  CheckCircle,
  AlertCircle,
  RotateCcw,
  Scan,
  ArrowLeft,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as faceapi from 'face-api.js';

interface FaceIdCameraProps {
  title: string;
  description: string;
  memberType: 'santri' | 'ppmi' | 'member';
  onReset: () => void;
}

export default function FaceIdCamera({
  title,
  description,
  memberType,
  onReset,
}: FaceIdCameraProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognitionStatus, setRecognitionStatus] = useState<
    'idle' | 'processing' | 'success' | 'failed'
  >('idle');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Memuat model face-api.js dari folder /public/models
  const loadModels = async () => {
    if (modelsLoaded) return;

    setIsLoadingModels(true);
    try {
      const MODEL_URL = '/models'; // Pastikan folder models ada di dalam folder public/
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
      console.log('Model face-api.js berhasil dimuat.');
    } catch (err) {
      console.error('Error loading face-api models:', err);
      setError(
        "Gagal memuat model AI. Pastikan folder 'models' tersedia di direktori /public."
      );
    } finally {
      setIsLoadingModels(false);
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      if (!modelsLoaded) {
        await loadModels();
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      setError(
        'Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan pada browser Anda.'
      );
      console.error('Error accessing camera:', err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };

  const getFaceDescriptor = async (): Promise<Float32Array | null> => {
    if (!videoRef.current || !modelsLoaded) return null;

    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      setError(
        'Wajah tidak terdeteksi. Posisikan wajah Anda di tengah lingkaran.'
      );
      return null;
    }

    setError(null);
    return detection.descriptor;
  };

  const performScan = async () => {
    if (!modelsLoaded) {
      setError('Model AI belum siap. Harap tunggu sebentar...');
      return;
    }

    setIsProcessing(true);
    setRecognitionStatus('processing');
    setError(null);

    try {
      const faceDescriptor = await getFaceDescriptor();

      if (!faceDescriptor) {
        setRecognitionStatus('failed');
        setIsProcessing(false);
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        throw new Error(
          'NEXT_PUBLIC_API_URL tidak disetel di environment variable.'
        );
      }

      const endpoint = `/ticketing/${memberType}`;

      const response = await fetch(`${apiUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceDescriptor: Array.from(faceDescriptor) }),
      });

      const result = await response.json();

      if (response.ok) {
        setRecognitionStatus('success');
        setTimeout(() => {
          const saleData = result.data;

          // --- MULAI PERBAIKAN ---

          // 1. Buat objek data yang sesuai dengan format `FaceIdData` di halaman struk
          const receiptData = {
            memberName: saleData.customerName,
            memberType: memberType === 'santri' ? 'santri' : 'non-santri',
            accessDate: saleData.Tanggal_Kunjungan || new Date().toISOString(),
            accessType: 'Akses Masuk',
            price: 0,
            total: 0,
          };

          // 2. Tambahkan `type=faceid` pada URL agar halaman struk tahu cara menampilkannya
          router.push(
            `/Receipt?type=faceid&data=${encodeURIComponent(
              JSON.stringify(receiptData)
            )}`
          );

          // --- AKHIR PERBAIKAN ---
        }, 2000);
      } else {
        setRecognitionStatus('failed');
        setError(
          result.message ||
            'Wajah tidak dikenali atau terjadi kesalahan server.'
        );
      }
    } catch (err: any) {
      console.error('Error during API call:', err);
      setRecognitionStatus('failed');
      setError(
        err.message || 'Gagal terhubung ke server. Periksa koneksi Anda.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScan = () => {
    setRecognitionStatus('idle');
    setIsProcessing(false);
    setError(null);
    if (!isStreaming) {
      startCamera();
    }
  };

  useEffect(() => {
    loadModels().then(() => {
      startCamera();
    });
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2"
              onClick={onReset}
              aria-label="Kembali"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <Camera className="w-6 h-6" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isLoadingModels && (
              <Alert>
                <AlertDescription className="text-center">
                  Memuat model AI untuk pengenalan wajah...
                </AlertDescription>
              </Alert>
            )}

            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  isStreaming ? 'opacity-100' : 'opacity-0'
                }`}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-60 h-60 border-4 border-white/50 rounded-full" />
              </div>

              {recognitionStatus === 'processing' && (
                <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p>Memindai wajah...</p>
                  </div>
                </div>
              )}

              {recognitionStatus === 'success' && (
                <div className="absolute inset-0 bg-green-500 bg-opacity-80 flex items-center justify-center">
                  <div className="text-white text-center">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4" />
                    <p className="text-xl font-semibold">Wajah Dikenali!</p>
                    <p>Mengalihkan halaman...</p>
                  </div>
                </div>
              )}

              {recognitionStatus === 'failed' && !error && (
                <div className="absolute inset-0 bg-red-500 bg-opacity-80 flex items-center justify-center">
                  <div className="text-white text-center">
                    <AlertCircle className="w-16 h-16 mx-auto mb-4" />
                    <p className="text-xl font-semibold">Gagal Dikenali</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 justify-center">
              {recognitionStatus === 'idle' && (
                <Button
                  onClick={performScan}
                  size="lg"
                  className="w-48"
                  disabled={isProcessing || !modelsLoaded}
                >
                  <Scan className="w-5 h-5 mr-2" />
                  Scan Wajah
                </Button>
              )}
              {recognitionStatus === 'failed' && (
                <Button
                  onClick={resetScan}
                  size="lg"
                  variant="outline"
                  className="w-48"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Coba Lagi
                </Button>
              )}
            </div>

            <div className="text-center text-sm text-gray-600 space-y-1 pt-4 border-t">
              <p>• Pastikan pencahayaan cukup dan wajah terlihat jelas.</p>
              <p>• Lepas kacamata hitam atau topi jika mengenakannya.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
