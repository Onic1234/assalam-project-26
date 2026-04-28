'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Camera,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Users,
  User,
} from 'lucide-react';
import * as faceapi from 'face-api.js';

// IMPROVED: The onFaceRegistered prop now passes the descriptor for backend processing.
interface FaceRegistrationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onFaceRegistered: (userId: number, faceDescriptor: number[]) => void;
  userId: number;
  userName: string;
  isUpdateMode?: boolean;
  userCategory?: 'santri' | 'member' | 'staff';
}

export default function FaceRegistrationDialog({
  isOpen,
  onOpenChange,
  onFaceRegistered,
  userId,
  userName,
  isUpdateMode = false,
  userCategory = 'member',
}: FaceRegistrationDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<
    'idle' | 'processing' | 'success' | 'failed'
  >('idle');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [faceCount, setFaceCount] = useState(0);
  const [faceStatus, setFaceStatus] = useState<'none' | 'single' | 'multiple'>(
    'none'
  );
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load face-api.js models
  const loadModels = async () => {
    if (modelsLoaded) return;

    setIsLoadingModels(true);
    try {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
      console.log('Face-api models loaded successfully');
    } catch (err) {
      console.error('Error loading face-api models:', err);
      setError('Gagal memuat model AI. Pastikan model tersedia di /models');
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Start the camera stream
  const startCamera = async () => {
    try {
      setError(null);
      if (!modelsLoaded) {
        await loadModels();
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        startFaceDetection();
      }
    } catch (err) {
      setError(
        'Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.'
      );
      console.error('Error accessing camera:', err);
    }
  };

  // Stop the camera stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
    stopFaceDetection();
  };

  // Real-time face detection to provide feedback
  const startFaceDetection = () => {
    if (detectionIntervalRef.current) return;

    detectionIntervalRef.current = setInterval(async () => {
      if (videoRef.current && modelsLoaded && registrationStatus === 'idle') {
        try {
          const detections = await faceapi.detectAllFaces(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions()
          );

          const count = detections.length;
          setFaceCount(count);

          if (count === 0) setFaceStatus('none');
          else if (count === 1) setFaceStatus('single');
          else setFaceStatus('multiple');
        } catch (err) {
          console.error('Error in face detection:', err);
        }
      }
    }, 500);
  };

  const stopFaceDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setFaceCount(0);
    setFaceStatus('none');
  };

  // MERGED LOGIC: Register face and pass descriptor to parent component
  const registerFace = async () => {
    if (!videoRef.current || !modelsLoaded) {
      setError('Kamera atau model AI belum siap.');
      return;
    }

    if (faceStatus !== 'single') {
      setError(
        faceStatus === 'multiple'
          ? `Terdeteksi ${faceCount} wajah. Pastikan hanya ada SATU wajah.`
          : 'Tidak ada wajah terdeteksi. Posisikan wajah Anda di depan kamera.'
      );
      return;
    }

    setIsProcessing(true);
    setRegistrationStatus('processing');
    setError(null);

    try {
      const detection = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setError('Wajah tidak terdeteksi saat pemrosesan. Silakan coba lagi.');
        setRegistrationStatus('failed');
        return;
      }

      // Convert Float32Array to a standard number array for API transfer
      const faceDescriptor = Array.from(detection.descriptor);

      // Call the parent component's handler with the user ID and the descriptor
      onFaceRegistered(userId, faceDescriptor);

      setRegistrationStatus('success');

      // Close the dialog after showing the success message
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    } catch (err) {
      console.error('Error in face registration:', err);
      setError('Terjadi kesalahan dalam pendaftaran wajah.');
      setRegistrationStatus('failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset component state when closed
  const resetState = () => {
    setRegistrationStatus('idle');
    setError(null);
    setIsProcessing(false);
    setFaceCount(0);
    setFaceStatus('none');
    stopCamera();
  };

  // Effect to manage camera and state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      resetState();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const getFaceStatusInfo = () => {
    switch (faceStatus) {
      case 'none':
        return { color: 'text-red-700' };
      case 'single':
        return { color: 'text-green-700' };
      case 'multiple':
        return { color: 'text-orange-700' };
      default:
        return { color: 'text-gray-600' };
    }
  };

  const statusInfo = getFaceStatusInfo();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {isUpdateMode ? 'Update Face ID' : 'Daftarkan Face ID'}
          </DialogTitle>
          <DialogDescription>
            {isUpdateMode
              ? `Perbarui Face ID untuk ${userName}`
              : `Daftarkan Face ID baru untuk ${userName} (${userCategory})`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLoadingModels && (
            <Alert>
              <AlertDescription>
                Memuat model AI untuk pengenalan wajah...
              </AlertDescription>
            </Alert>
          )}

          {/* Camera View */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Overlays for processing status */}
            {registrationStatus === 'processing' && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                <p className="mt-4">Memproses pendaftaran wajah...</p>
              </div>
            )}
            {registrationStatus === 'success' && (
              <div className="absolute inset-0 bg-green-500 bg-opacity-80 flex flex-col items-center justify-center text-white">
                <CheckCircle className="w-16 h-16" />
                <p className="mt-2 text-xl font-semibold">Berhasil!</p>
              </div>
            )}
            {registrationStatus === 'failed' && (
              <div
                className="absolute inset-0 bg-red-500 bg-opacity-80 flex items-center justify-center text-white"
                onClick={() => setRegistrationStatus('idle')}
              >
                <div className="text-white text-center">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4" />
                  <p className="text-xl font-semibold">Gagal</p>
                  <p className="text-sm mt-1">Klik untuk mencoba lagi</p>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <h4 className="font-semibold text-blue-900 mb-2">
              Petunjuk Pendaftaran
            </h4>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Pastikan pencahayaan cukup dan wajah terlihat jelas.</li>
              <li>
                Tatap langsung ke kamera dan jangan gunakan masker/kacamata
                hitam.
              </li>
              <li className="font-semibold">
                PENTING: Pastikan hanya ada SATU wajah dalam frame.
              </li>
              <li>Tunggu status siap sebelum menekan tombol daftar.</li>
            </ul>
          </div>

          {/* Registration Statistics */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Status Deteksi</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-white rounded p-3 border">
                <div className="text-gray-600">Wajah Terdeteksi</div>
                <div className={`text-lg font-semibold ${statusInfo.color}`}>
                  {faceCount}
                </div>
              </div>
              <div className="bg-white rounded p-3 border">
                <div className="text-gray-600">Status</div>
                <div className={`font-medium ${statusInfo.color}`}>
                  {faceStatus === 'single'
                    ? 'Siap Mendaftar'
                    : faceStatus === 'multiple'
                    ? 'Terlalu Banyak'
                    : 'Menunggu'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Batal
          </Button>
          <Button
            onClick={registerFace}
            disabled={isProcessing || !modelsLoaded || faceStatus !== 'single'}
          >
            {isProcessing
              ? 'Memproses...'
              : isUpdateMode
              ? 'Update Face ID'
              : 'Daftarkan Face ID'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
