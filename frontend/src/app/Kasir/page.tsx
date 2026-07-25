'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// Import face-api.js
import * as faceapi from 'face-api.js';
import {
  Camera,
  Minus,
  Plus,
  ShoppingCart,
  CheckCircle,
  XCircle,
  CameraOff,
  UserCircle,
  ShieldCheck,
  Search,
  Package,
  Grid3X3,
  List,
  Upload,
  Image as ImageIcon,
  Loader2,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreditCard, QrCode } from 'lucide-react';
import { QrisDisplay } from '@/components/qris-display'; // Adjust the import path if necessary

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  image?: string;
  stock: number;
  quantity?: number;
  barcode?: string;
  category?: Category;
  categoryId?: number;
}

interface Balance {
  id: number;
  ownerId: number;
  ownerType: 'santri' | 'admin' | 'kasir';
  amount: number;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: number;
  no?: number;
  id_santri?: string;
  nama_santri?: string;
  jenis_kelamin?: 'L' | 'P';
  kelas?: string;
  unit?: string;
  username?: string;
  role: 'santri' | 'admin' | 'kasir';
  FaceID?: string;
  createdAt?: string;
  updatedAt?: string;
  balance: Balance;
}

type AuthFlow = 'options' | 'face-id' | 'dashboard';

interface PaymentResult {
  success: boolean;
  message: string;
  studentName: string;
  totalAmount: number;
  newBalance?: number;
  items: Product[];
}

interface DetectionFeedback {
  status:
    | 'detecting'
    | 'detected'
    | 'not_detected'
    | 'error'
    | 'scanning'
    | null;
  message: string;
  detectedCount?: number;
  timestamp?: Date;
}

const safeJsonFetch = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return { ok: response.ok, status: response.status, data };
    }
    const rawText = await response.text();
    return {
      ok: false,
      status: response.status,
      data: {
        success: false,
        message: `Koneksi ke backend bermasalah (Status ${response.status}).`,
        rawText,
      },
    };
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      data: {
        success: false,
        message: error?.message || 'Tidak dapat terhubung ke server backend.',
      },
    };
  }
};

const isTokenExpired = (token: string | null): boolean => {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    );
    if (!payload.exp) return false;
    // 10-second buffer
    return Date.now() >= payload.exp * 1000 - 10000;
  } catch (e) {
    return true;
  }
};

export default function Dashboard() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [authFlow, setAuthFlow] = useState<AuthFlow>('options');
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null);
  const [scannedProducts, setScannedProducts] = useState<Product[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(
    null
  );
  const [showPaymentResult, setShowPaymentResult] = useState(false);

  const [authToken, setAuthToken] = useState<string | null>(null);

  // Product states
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productError, setProductError] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<
    'granted' | 'denied' | 'prompt'
  >('prompt');
  const [scanMode, setScanMode] = useState<'face' | 'product'>('product');
  const [detectionFeedback, setDetectionFeedback] = useState<DetectionFeedback>(
    {
      status: null,
      message: '',
    }
  );

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // States for the kasir login modal
  const [isKasirLoginModalOpen, setIsKasirLoginModalOpen] = useState(false);
  const [kasirUsername, setKasirUsername] = useState('');
  const [kasirPassword, setKasirPassword] = useState('');
  const [kasirLoginError, setKasirLoginError] = useState<string | null>(null);
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] =
    useState(false);
  const [isQrisModalOpen, setIsQrisModalOpen] = useState(false);

  // Manual photo scanner states
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [scanResultProduct, setScanResultProduct] = useState<Product | null>(null);
  const [isScanResultDialogOpen, setIsScanResultDialogOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

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

  useEffect(() => {
    setIsClient(true);
    fetchVideoDevices();
    if (navigator.permissions) {
      navigator.permissions
        .query({ name: 'camera' as PermissionName })
        .then((result) => {
          setCameraPermission(result.state as 'granted' | 'denied' | 'prompt');
        });
    }
    loadModels();
    loadProducts();

    // Check if there is a saved cashier session in localStorage
    const savedToken = localStorage.getItem('kasirToken');
    const savedUser = localStorage.getItem('kasirUser');
    if (savedToken && savedUser) {
      if (isTokenExpired(savedToken)) {
        console.warn('Saved kasir token is expired. Removing stale session.');
        localStorage.removeItem('kasirToken');
        localStorage.removeItem('kasirUser');
      } else {
        try {
          const parsedUser = JSON.parse(savedUser);
          if (parsedUser.role === 'kasir') {
            setAuthenticatedUser(parsedUser);
            setAuthToken(savedToken);
            setAuthFlow('dashboard');
            setScanMode('product');
          }
        } catch (e) {
          console.error('Error parsing saved cashier user:', e);
        }
      }
    }
  }, []);

  const loadModels = async (): Promise<boolean> => {
    if (modelsLoaded) return true;
    setIsLoadingModels(true);
    try {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      setModelsLoaded(true);
      console.log('Model face-api.js berhasil dimuat.');
      return true;
    } catch (err) {
      console.error('Error loading face-api models:', err);
      setCameraError('Gagal memuat model AI. Periksa konsol untuk detail.');
      return false;
    } finally {
      setIsLoadingModels(false);
    }
  };

  const loadProducts = async () => {
    setIsLoadingProducts(true);
    setProductError('');
    try {
      const { ok, data: result } = await safeJsonFetch(
        `${API_BASE_URL}/products?limit=100&includeCategory=true`
      );

      if (ok && result?.success && result?.data) {
        const productsData = result.data.products || [];
        setProducts(productsData);
        setFilteredProducts(productsData);

        const uniqueCategories = productsData
          .filter((product: Product) => product.category)
          .map((product: Product) => product.category!)
          .filter(
            (category: Category, index: number, self: Category[]) =>
              index === self.findIndex((c: Category) => c.id === category.id)
          );
        setCategories(uniqueCategories);
        setProductError('');
      } else {
        throw new Error(result?.message || 'Gagal memuat produk');
      }
    } catch (error: any) {
      console.error('Error loading products:', error);
      const fallbackProducts: Product[] = [
        {
          id: 1,
          name: 'Nasi Gudeg',
          price: 15000,
          stock: 20,
          image: '/placeholder.svg?height=100&width=100',
          category: { id: 1, name: 'Makanan Utama' },
        },
        {
          id: 2,
          name: 'Es Teh Manis',
          price: 5000,
          stock: 50,
          image: '/placeholder.svg?height=100&width=100',
          category: { id: 2, name: 'Minuman' },
        },
        {
          id: 3,
          name: 'Kerupuk',
          price: 2000,
          stock: 100,
          image: '/placeholder.svg?height=100&width=100',
          category: { id: 3, name: 'Snack' },
        },
      ];
      setProducts(fallbackProducts);
      setFilteredProducts(fallbackProducts);
      setCategories([
        { id: 1, name: 'Makanan Utama' },
        { id: 2, name: 'Minuman' },
        { id: 3, name: 'Snack' },
      ]);
      // Clear productError so fallback products are shown instead of a raw syntax error blocking the UI
      setProductError('');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    let filtered = products;

    if (searchQuery) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(
        (product) => product.category?.id === selectedCategory
      );
    }

    setFilteredProducts(filtered);
  }, [searchQuery, selectedCategory, products]);

  const totalPrice = scannedProducts.reduce((total, product) => {
    return total + product.price * (product.quantity || 1);
  }, 0);

  useEffect(() => {
    if (showPaymentResult && paymentResult) {
      const timer = setTimeout(() => {
        setShowPaymentResult(false);
        setPaymentResult(null);
        if (paymentResult.success) {
          const isKasirTransaction = authenticatedUser?.role === 'kasir';

          const receiptData = {
            studentName: isKasirTransaction
              ? 'Pembelian Tunai'
              : paymentResult.studentName,
            studentId: isKasirTransaction
              ? 'kasir'
              : authenticatedUser?.id_santri || '',
            items: paymentResult.items.map((item) => ({
              id: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity || 1,
            })),
            totalAmount: paymentResult.totalAmount,
            newBalance: paymentResult.newBalance || 0,
            purchaseDate: new Date().toISOString(),
            transactionId: `TXN-${Date.now().toString().slice(-8)}`,
          };
          const queryParams = new URLSearchParams({
            data: encodeURIComponent(JSON.stringify(receiptData)),
            type: 'product_purchase',
            source: 'kasir',
          });
          router.push(`/Receipt?${queryParams.toString()}`);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showPaymentResult, paymentResult, authenticatedUser, router]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setVideoReady(false);
    setCameraError('');
  }, []);

  const startCamera = async (targetDeviceId?: string) => {
    if (scanMode === 'face' && !modelsLoaded) {
      setCameraError('Memuat model AI... Harap tunggu');
      const loaded = await loadModels();
      if (!loaded) {
        setCameraError('Tidak dapat memuat model AI. Tidak bisa melanjutkan.');
        return;
      }
    }

    try {
      setCameraError('');
      setIsLoading(true);
      stopCamera();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Kamera tidak didukung di browser ini');
      }

      const requestedId = targetDeviceId !== undefined ? targetDeviceId : selectedDeviceId;

      let videoConstraint: any = {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        facingMode: scanMode === 'product' ? 'environment' : 'user',
        frameRate: { ideal: 30, max: 60 },
      };

      if (requestedId && requestedId.trim() !== '') {
        videoConstraint = {
          deviceId: { exact: requestedId },
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
        };
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraint, audio: false });
      } catch (firstErr) {
        console.warn('getUserMedia with deviceId constraint failed, falling back to video: true:', firstErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve, reject) => {
          videoRef.current!.addEventListener(
            'loadedmetadata',
            () => {
              setVideoReady(true);
              setIsCameraActive(true);
              resolve();
            },
            { once: true }
          );
          videoRef.current!.addEventListener(
            'error',
            () => reject(new Error('Gagal memuat video')),
            { once: true }
          );
        });
        setCameraPermission('granted');
        fetchVideoDevices();
      }
    } catch (error: any) {
      console.warn('Camera error:', error);
      let errorMessage = 'Tidak dapat mengakses kamera';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Izin kamera ditolak. Mohon izinkan akses kamera.';
        setCameraPermission('denied');
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'Tidak ada kamera yang ditemukan.';
      } else {
        errorMessage = error.message;
      }
      setCameraError(errorMessage);
      setIsCameraActive(false);
      setVideoReady(false);
      stopCamera();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSantriFaceScan = useCallback(async () => {
    if (!videoRef.current || !isCameraActive || !videoReady || !modelsLoaded) {
      setDetectionFeedback({
        status: 'error',
        message: 'Kamera atau model AI belum siap.',
        timestamp: new Date(),
      });
      return;
    }

    try {
      setIsLoading(true);
      setDetectionFeedback({
        status: 'detecting',
        message: 'Menganalisis wajah...',
        timestamp: new Date(),
      });

      const detection = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions()
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setDetectionFeedback({
          status: 'not_detected',
          message: 'Wajah tidak terdeteksi. Coba lagi.',
          timestamp: new Date(),
        });
        setIsLoading(false);
        return;
      }

      const faceDescriptor = Array.from(detection.descriptor);
      const response = await fetch(`${API_BASE_URL}/auth/login/santri`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceDescriptor }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || 'Wajah tidak dikenali atau tidak cocok.'
        );
      }

      const userData = result.data.user;

      setDetectionFeedback({
        status: 'detected',
        message: `Selamat datang, ${userData.nama_santri || 'Santri'}!`,
        timestamp: new Date(),
      });
      setAuthToken(result.data.token);

      setAuthenticatedUser({
        id: userData.id,
        no: userData.no,
        id_santri: userData.id_santri,
        nama_santri: userData.nama_santri,
        jenis_kelamin: userData.jenis_kelamin,
        kelas: userData.kelas,
        unit: userData.unit,
        username: userData.username,
        role: 'santri',
        FaceID: userData.FaceID,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        balance: userData.balance,
      });

      setTimeout(() => {
        setAuthFlow('dashboard');
        setScanMode('product');
        stopCamera();
      }, 2000);
    } catch (error: any) {
      console.error('Error during face scan login:', error);
      setDetectionFeedback({
        status: 'error',
        message: error.message || 'Gagal login. Coba lagi.',
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
    }
  }, [isCameraActive, videoReady, modelsLoaded, stopCamera]);

  const handleKasirLogin = useCallback(async () => {
    setIsLoading(true);
    setKasirLoginError(null);
    try {
      const { ok, data: result } = await safeJsonFetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: kasirUsername,
          password: kasirPassword,
        }),
      });

      if (!ok || !result.success) {
        setKasirLoginError(result.message || 'Username atau password salah.');
        return;
      }

      setAuthenticatedUser(result.data.user);
      setAuthToken(result.data.token);
      setAuthFlow('dashboard');
      setScanMode('product');

      localStorage.setItem('kasirToken', result.data.token);
      localStorage.setItem('kasirUser', JSON.stringify(result.data.user));

      setIsKasirLoginModalOpen(false);
      setKasirUsername('');
      setKasirPassword('');
    } catch (error) {
      console.error('Error logging in as Kasir:', error);
      setKasirLoginError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }, [kasirUsername, kasirPassword]);

  const showSantriFaceLogin = useCallback(() => {
    setScanMode('face');
    setAuthFlow('face-id');
  }, []);

  const resetToOptions = useCallback(() => {
    stopCamera();
    setAuthFlow('options');
    setAuthenticatedUser(null);
    setScannedProducts([]);
    setDetectionFeedback({ status: null, message: '' });
    setScanMode('product');
    localStorage.removeItem('kasirToken');
    localStorage.removeItem('kasirUser');
  }, [stopCamera]);

  const addProductToCart = useCallback((product: Product) => {
    setScannedProducts((prev) => {
      const existingProduct = prev.find((p) => p.id === product.id);
      if (existingProduct) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, quantity: (p.quantity || 1) + 1 } : p
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  }, []);

  const removeProductFromCart = useCallback((productId: number) => {
    setScannedProducts((prev) => prev.filter((p) => p.id !== productId));
  }, []);

  const updateProductQuantity = useCallback(
    (productId: number, quantity: number) => {
      if (quantity <= 0) {
        removeProductFromCart(productId);
        return;
      }
      setScannedProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, quantity } : p))
      );
    },
    [removeProductFromCart]
  );

  const handlePayment = useCallback(
    async (paymentMethod: 'Saldo' | 'Tunai' | 'QRIS') => {
      if (!authenticatedUser || !authToken || isTokenExpired(authToken)) {
        localStorage.removeItem('kasirToken');
        localStorage.removeItem('kasirUser');
        setAuthToken(null);
        setPaymentResult({
          success: false,
          message: 'Sesi Anda telah berakhir (Token expired). Silakan login kembali.',
          studentName: authenticatedUser?.nama_santri || authenticatedUser?.username || '',
          totalAmount: totalPrice,
          items: scannedProducts,
        });
        setShowPaymentResult(true);
        if (authenticatedUser?.role === 'kasir') {
          setIsKasirLoginModalOpen(true);
        }
        return;
      }

      if (!authenticatedUser || scannedProducts.length === 0) return;

      setIsLoading(true);
      try {
        const items = scannedProducts.map((p) => ({
          productId: p.id,
          quantity: p.quantity || 1,
        }));

        const { ok, status, data: result } = await safeJsonFetch(
          `${API_BASE_URL}/transactions/purchase`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              items: items,
              payment_method: paymentMethod,
            }),
          }
        );

        const isExpiredError =
          status === 401 ||
          (result?.message &&
            (result.message.toLowerCase().includes('token') ||
              result.message.toLowerCase().includes('expired') ||
              result.message.toLowerCase().includes('unauthorized'))) ||
          result?.error === 'Unauthorized';

        if (result.success) {
          setPaymentResult({
            success: true,
            message: 'Pembayaran berhasil!',
            studentName:
              authenticatedUser.nama_santri || authenticatedUser.username || '',
            totalAmount: totalPrice,
            newBalance: result.data.new_balance,
            items: scannedProducts,
          });

          if (
            authenticatedUser.role === 'santri' &&
            result.data.new_balance !== undefined
          ) {
            setAuthenticatedUser((prev) =>
              prev
                ? {
                    ...prev,
                    balance: {
                      ...prev.balance,
                      amount: result.data.new_balance,
                    },
                  }
                : null
            );
          }

          setScannedProducts([]);
          setShowPaymentResult(true);
        } else if (isExpiredError) {
          localStorage.removeItem('kasirToken');
          localStorage.removeItem('kasirUser');
          setAuthToken(null);
          setPaymentResult({
            success: false,
            message: 'Sesi Anda telah berakhir (Token expired). Silakan login kembali.',
            studentName:
              authenticatedUser.nama_santri || authenticatedUser.username || '',
            totalAmount: totalPrice,
            items: scannedProducts,
          });
          setShowPaymentResult(true);
          if (authenticatedUser.role === 'kasir') {
            setIsKasirLoginModalOpen(true);
          }
        } else {
          setPaymentResult({
            success: false,
            message: result.message || 'Pembayaran gagal',
            studentName:
              authenticatedUser.nama_santri || authenticatedUser.username || '',
            totalAmount: totalPrice,
            items: scannedProducts,
          });
          setShowPaymentResult(true);
        }
      } catch (error: any) {
        console.error('Payment error:', error);
        setPaymentResult({
          success: false,
          message: 'Terjadi kesalahan saat memproses pembayaran.',
          studentName:
            authenticatedUser.nama_santri || authenticatedUser.username || '',
          totalAmount: totalPrice,
          items: scannedProducts,
        });
        setShowPaymentResult(true);
      } finally {
        setIsLoading(false);
      }
    },
    [authenticatedUser, authToken, scannedProducts, totalPrice, resetToOptions]
  );

  const handlePayButtonClick = () => {
    // For cashiers, show the payment method choice.
    if (authenticatedUser?.role === 'kasir') {
      setIsPaymentMethodModalOpen(true);
    }
    // For students, the existing flow (payment with Saldo) remains.
    else {
      handlePayment('Saldo');
    }
  };

  useEffect(() => {
    if (authFlow === 'face-id' && isClient) {
      const timer = setTimeout(() => {
        startCamera();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [authFlow, isClient, startCamera]);

  // Handlers for manual photo scanner
  const handlePhotoUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUploadedImage(dataUrl);
      setScanResultProduct(null);

      // Simple keyword matching based on filename
      const fileName = file.name.toLowerCase();
      const matched = products.find((p) => {
        const prodName = p.name.toLowerCase();
        // Match if filename contains product name or product name contains filename keywords
        return fileName.includes(prodName) || 
               prodName.split(' ').some(word => word.length > 2 && fileName.includes(word));
      });

      if (matched) {
        setScanResultProduct(matched);
      }
    };
    reader.readAsDataURL(file);
  }, [products]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePhotoUpload(file);
    }
  }, [handlePhotoUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handlePhotoUpload(file);
    }
  }, [handlePhotoUpload]);

  const startPhotoScan = useCallback(() => {
    if (!uploadedImage) return;
    setIsScanningImage(true);
    setTimeout(() => {
      setIsScanningImage(false);
      setIsScanResultDialogOpen(true);
    }, 2000);
  }, [uploadedImage]);

  const handleRemovePhoto = useCallback(() => {
    setUploadedImage(null);
    setScanResultProduct(null);
  }, []);

  useEffect(() => {
    if (authenticatedUser) {
      console.log('Current authenticated user:', authenticatedUser);
    }
  }, [authenticatedUser]);

  if (!isClient) {
    return (
      <div className="flex h-screen w-full bg-gray-100 items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const renderLoginOptions = () => (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gray-100">
      <div className="mb-8 text-center">
        <Image
          src="/icons/Logo AOPS.png"
          alt="AOPS Logo"
          width={250}
          height={250}
          className="object-contain"
        />
        {/* <h1 className="text-4xl font-bold text-gray-800 mt-2">PKasir</h1> */}
        {/* <p className="text-gray-600 mt-1">Aplikasi Kasir Kantin Sekolah</p> */}
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Pilih Metode Login
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button
            onClick={showSantriFaceLogin}
            className="h-16 text-lg bg-transparent"
            variant="outline"
            disabled={isLoadingModels || isLoading}
          >
            <Camera className="h-6 w-6 mr-3 text-blue-500" />
            {isLoadingModels ? 'Memuat Model AI...' : 'Login Santri (Wajah)'}
          </Button>
          <Button
            onClick={() => setIsKasirLoginModalOpen(true)}
            className="h-16 text-lg"
            variant="default"
            disabled={isLoading}
          >
            <ShieldCheck className="h-6 w-6 mr-3" />
            Login Sebagai Kasir
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderFaceIdLogin = () => (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gray-100">
      <Card className="w-full max-w-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Camera className="h-7 w-7 text-blue-500" />
            Verifikasi Wajah Santri
          </CardTitle>
          <p className="text-muted-foreground">
            Posisikan wajah Anda di dalam area kamera.
          </p>

          {videoDevices.length > 0 && (
            <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded border text-xs text-left max-w-md mx-auto">
              <Camera className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <span className="font-semibold text-slate-600 dark:text-slate-300 flex-shrink-0">Pilih Kamera:</span>
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedDeviceId(newId);
                  localStorage.setItem('preferred_camera_device_id', newId);
                  startCamera(newId);
                }}
                className="flex-1 h-7 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                {videoDevices.map((device, idx) => (
                  <option key={device.deviceId || idx} value={device.deviceId}>
                    {device.label || `Kamera USB / Eksternal ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {cameraError && (
            <div className="bg-red-100 text-red-800 p-3 rounded-md text-sm text-center">
              {cameraError}
            </div>
          )}
          <div className="relative bg-slate-900 rounded-md overflow-hidden aspect-video">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
              style={{
                display: isCameraActive && videoReady ? 'block' : 'none',
              }}
            />
            {(!isCameraActive || !videoReady) && (
              <div className="absolute inset-0 flex items-center justify-center text-white bg-black">
                {isLoading ? (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                    Menyalakan kamera...
                  </div>
                ) : (
                  <CameraOff className="h-12 w-12 text-gray-500" />
                )}
              </div>
            )}
            {detectionFeedback.status &&
              detectionFeedback.status !== 'scanning' && (
                <div
                  className={`absolute inset-0 flex items-center justify-center text-white text-center p-4
                    ${
                      detectionFeedback.status === 'detecting'
                        ? 'bg-blue-500/70'
                        : ''
                    }
                    ${
                      detectionFeedback.status === 'detected'
                        ? 'bg-green-500/80'
                        : ''
                    }
                    ${
                      detectionFeedback.status === 'error' ||
                      detectionFeedback.status === 'not_detected'
                        ? 'bg-red-500/80'
                        : ''
                    }
                  `}
                >
                  <div>
                    {detectionFeedback.status === 'detected' && (
                      <CheckCircle className="h-12 w-12 mx-auto mb-2" />
                    )}
                    {(detectionFeedback.status === 'error' ||
                      detectionFeedback.status === 'not_detected') && (
                      <XCircle className="h-12 w-12 mx-auto mb-2" />
                    )}
                    {detectionFeedback.status === 'detecting' && (
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto mb-2"></div>
                    )}
                    <p className="font-semibold text-lg">
                      {detectionFeedback.message}
                    </p>
                  </div>
                </div>
              )}
          </div>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={handleSantriFaceScan}
              size="lg"
              className="flex-1"
              disabled={!isCameraActive || !videoReady || isLoading}
            >
              <UserCircle className="mr-2 h-5 w-5" />
              {isLoading ? 'Memindai...' : 'Pindai Wajah Saya'}
            </Button>
            <Button
              variant="outline"
              onClick={resetToOptions}
              disabled={isLoading}
              size="lg"
            >
              Kembali
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderKasirLoginModal = () => (
    <Dialog
      open={isKasirLoginModalOpen}
      onOpenChange={(isOpen) => {
        setIsKasirLoginModalOpen(isOpen);
        if (!isOpen) {
          setKasirLoginError(null);
          setKasirUsername('');
          setKasirPassword('');
        }
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Login Kasir</DialogTitle>
          <DialogDescription>
            Masukkan username dan password Anda untuk melanjutkan.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">
              Username
            </Label>
            <Input
              id="username"
              value={kasirUsername}
              onChange={(e) => setKasirUsername(e.target.value)}
              className="col-span-3"
              disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={kasirPassword}
              onChange={(e) => setKasirPassword(e.target.value)}
              className="col-span-3"
              disabled={isLoading}
            />
          </div>
          {kasirLoginError && (
            <p className="col-span-4 text-center text-sm text-red-500">
              {kasirLoginError}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsKasirLoginModalOpen(false)}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button onClick={handleKasirLogin} disabled={isLoading}>
            {isLoading ? 'Memproses...' : 'Login'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderProductModal = () => (
    <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-6 w-6" />
            Pilih Produk
          </DialogTitle>
          <DialogDescription>
            Pilih produk yang ingin ditambahkan ke keranjang
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Cari produk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              Semua
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={
                  selectedCategory === category.id ? 'default' : 'outline'
                }
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
              </Button>
            ))}
          </div>

          <ScrollArea className="flex-1">
            {isLoadingProducts ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : productError ? (
              <div className="text-center text-red-500 p-4">{productError}</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center text-gray-500 p-8">
                <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Tidak ada produk ditemukan</p>
              </div>
            ) : (
              <div
                className={`gap-4 ${
                  viewMode === 'grid'
                    ? 'grid grid-cols-2 md:grid-cols-3'
                    : 'flex flex-col'
                }`}
              >
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow ${
                      viewMode === 'list' ? 'flex-row' : ''
                    }`}
                    onClick={() => {
                      addProductToCart(product);
                      setIsProductModalOpen(false);
                    }}
                  >
                    <CardContent
                      className={`p-4 ${
                        viewMode === 'list' ? 'flex items-center gap-4' : ''
                      }`}
                    >
                      <div
                        className={`${
                          viewMode === 'list' ? 'flex-shrink-0' : 'mb-3'
                        }`}
                      >
                        <Image
                          src={
                            product.image ||
                            '/placeholder.svg?height=80&width=80'
                          }
                          alt={product.name}
                          width={viewMode === 'list' ? 60 : 80}
                          height={viewMode === 'list' ? 60 : 80}
                          className="rounded-md object-cover mx-auto"
                        />
                      </div>
                      <div
                        className={`${
                          viewMode === 'list' ? 'flex-1' : 'text-center'
                        }`}
                      >
                        <h3 className="font-medium text-sm mb-1">
                          {product.name}
                        </h3>
                        <p className="text-lg font-bold text-green-600 mb-1">
                          Rp {product.price.toLocaleString()}
                        </p>
                        <div className="flex items-center gap-2 justify-center">
                          <Badge
                            variant={
                              product.stock > 10
                                ? 'default'
                                : product.stock > 0
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            Stok: {product.stock}
                          </Badge>
                          {product.category && (
                            <Badge variant="outline" className="text-xs">
                              {product.category.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
  const renderPaymentMethodModal = () => (
    <Dialog
      open={isPaymentMethodModalOpen}
      onOpenChange={setIsPaymentMethodModalOpen}
    >
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Pilih Metode Pembayaran</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          {/* Button for Tunai/Cash Payment */}
          <Button
            className="h-20 text-lg"
            variant="outline"
            onClick={() => {
              setIsPaymentMethodModalOpen(false);
              handlePayment('Tunai'); // Process as a cash transaction
            }}
          >
            <CreditCard className="mr-3 h-7 w-7" />
            Tunai
          </Button>

          {/* Button to show QRIS display */}
          <Button
            className="h-20 text-lg"
            onClick={() => {
              setIsPaymentMethodModalOpen(false); // Close this modal
              setIsQrisModalOpen(true); // And open the QRIS modal
            }}
          >
            <QrCode className="mr-3 h-7 w-7" />
            QRIS
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderQrisModal = () => (
    <Dialog open={isQrisModalOpen} onOpenChange={setIsQrisModalOpen}>
      <DialogContent className="sm:max-w-sm">
        <QrisDisplay
          variant="card"
          size="lg"
          title="Pembayaran via QRIS"
          description="Minta pelanggan untuk memindai kode QR ini. Klik konfirmasi jika sudah dibayar."
          showRefresh={true}
          onError={(errorMsg) => {
            // Handle error, e.g., show a toast notification
            console.error('Gagal memuat QRIS:', errorMsg);
          }}
        />
        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={() => setIsQrisModalOpen(false)}>
            Batal
          </Button>
          <Button
            onClick={() => {
              setIsQrisModalOpen(false);
              // After visual confirmation, record the transaction.
              // We'll pass 'QRIS' as the method.
              handlePayment('QRIS');
            }}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Konfirmasi Pembayaran
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderScanResultModal = () => (
    <Dialog open={isScanResultDialogOpen} onOpenChange={setIsScanResultDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <QrCode className="h-6 w-6 text-green-500" />
            Hasil Pemindaian Foto
          </DialogTitle>
          <DialogDescription>
            Tinjau dan sesuaikan produk yang berhasil diidentifikasi.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {uploadedImage && (
            <div className="relative h-40 bg-slate-900 rounded-md overflow-hidden flex items-center justify-center border border-muted">
              <img
                src={uploadedImage}
                alt="Scanned product preview"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}

          {scanResultProduct ? (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/50 rounded-lg flex items-center gap-4">
              <div className="w-16 h-16 rounded-md overflow-hidden bg-white border flex-shrink-0">
                <Image
                  src={scanResultProduct.image || '/placeholder.svg?height=60&width=60'}
                  alt={scanResultProduct.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600 hover:bg-green-600">Terdeteksi Otomatis</Badge>
                  {scanResultProduct.category && (
                    <Badge variant="outline" className="text-xs">{scanResultProduct.category.name}</Badge>
                  )}
                </div>
                <h4 className="font-semibold text-base text-slate-900 dark:text-white truncate mt-1">
                  {scanResultProduct.name}
                </h4>
                <p className="font-bold text-green-600 text-lg">
                  Rp {scanResultProduct.price.toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">
                <Package className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-amber-800 dark:text-amber-300">
                  Produk Tidak Langsung Dikenali
                </h4>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Silakan pilih produk yang sesuai secara manual dari pilihan di bawah untuk ditambahkan.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="matchedProductSelect" className="text-sm font-medium">
              {scanResultProduct ? 'Sesuaikan Produk (Jika Salah):' : 'Pilih Produk Cocok:'}
            </Label>
            <div className="relative">
              <select
                id="matchedProductSelect"
                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={scanResultProduct?.id || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const found = products.find(p => p.id === Number(val));
                  setScanResultProduct(found || null);
                }}
              >
                <option value="">-- Pilih Produk --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - Rp {p.price.toLocaleString()} (Stok: {p.stock})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setIsScanResultDialogOpen(false)}
          >
            Batal
          </Button>
          <Button
            onClick={() => {
              if (scanResultProduct) {
                addProductToCart(scanResultProduct);
                setIsScanResultDialogOpen(false);
                setUploadedImage(null);
                setScanResultProduct(null);
              }
            }}
            disabled={!scanResultProduct}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Tambahkan ke Keranjang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const renderDashboard = () => (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      <header className="border-b bg-white shadow-sm">
        <div className="flex h-16 items-center px-8 justify-between">
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Image
              src="/icons/Logo AOPS.png"
              alt="AOPS Logo"
              width={32}
              height={32}
              className="object-contain"
            />
            Assalaam Olympic Pool POS
          </h1>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">
                {authenticatedUser?.role === 'santri'
                  ? authenticatedUser.nama_santri || 'Nama tidak ditemukan'
                  : authenticatedUser?.username || 'Username tidak ditemukan'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={resetToOptions}
              disabled={isLoading}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-full">
          <div className="p-4 lg:p-6 border-b lg:border-b-0 lg:border-r flex flex-col min-h-[50vh] lg:min-h-0">
            <Card className="w-full h-full flex flex-col overflow-hidden">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl font-bold">
                    <Package className="h-6 w-6 text-green-600" />
                    Katalog Produk
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setViewMode('grid')}
                      title="Tampilan Grid"
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setViewMode('list')}
                      title="Tampilan List"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsScanResultDialogOpen(true)}
                      className="text-xs text-muted-foreground hover:text-foreground hidden sm:flex items-center gap-1"
                      title="Unggah Foto (Opsional)"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Foto
                    </Button>
                  </div>
                </div>

                {/* Search Bar & Category Pills */}
                <div className="space-y-3 pt-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Cari nama produk..."
                      className="pl-9 text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Categories Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                    <Button
                      variant={selectedCategory === null ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(null)}
                      className="h-7 text-xs rounded-full px-3"
                    >
                      Semua
                    </Button>
                    {categories.map((category) => (
                      <Button
                        key={category.id}
                        variant={selectedCategory === category.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory(category.id)}
                        className="h-7 text-xs rounded-full px-3 whitespace-nowrap"
                      >
                        {category.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-auto p-4 bg-slate-50/50 dark:bg-slate-950/20">
                {isLoadingProducts ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <Package className="h-12 w-12 mb-2 opacity-40" />
                    <p className="text-sm font-medium">Tidak ada produk ditemukan</p>
                  </div>
                ) : (
                  <div
                    className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-2 sm:grid-cols-3 gap-3'
                        : 'flex flex-col gap-2'
                    }
                  >
                    {filteredProducts.map((product) => (
                      <Card
                        key={product.id}
                        onClick={() => addProductToCart(product)}
                        className={`group cursor-pointer hover:border-green-500 hover:shadow-md transition-all border bg-white dark:bg-slate-900 ${
                          viewMode === 'list' ? 'flex items-center p-2.5 gap-3' : 'overflow-hidden flex flex-col justify-between'
                        }`}
                      >
                        {viewMode === 'grid' ? (
                          <>
                            <div className="relative h-28 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center p-2">
                              <Image
                                src={
                                  product.image ||
                                  '/placeholder.svg?height=100&width=100'
                                }
                                alt={product.name}
                                width={90}
                                height={90}
                                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-200"
                              />
                              <Badge
                                variant={
                                  product.stock > 10
                                    ? 'secondary'
                                    : product.stock > 0
                                    ? 'outline'
                                    : 'destructive'
                                }
                                className="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0 bg-white/90 dark:bg-slate-900/90 shadow-sm"
                              >
                                Stok: {product.stock}
                              </Badge>
                            </div>
                            <div className="p-3 flex flex-col flex-1 justify-between">
                              <div>
                                {product.category && (
                                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider block mb-0.5">
                                    {product.category.name}
                                  </span>
                                )}
                                <h4 className="font-semibold text-xs sm:text-sm line-clamp-1 group-hover:text-green-600 transition-colors">
                                  {product.name}
                                </h4>
                              </div>
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <span className="font-bold text-green-600 text-xs sm:text-sm">
                                  Rp {product.price.toLocaleString()}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 rounded-full bg-green-50 text-green-600 hover:bg-green-600 hover:text-white group-hover:bg-green-600 group-hover:text-white transition-colors"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded bg-slate-100 dark:bg-slate-800 flex-shrink-0 flex items-center justify-center p-1">
                              <Image
                                src={
                                  product.image ||
                                  '/placeholder.svg?height=50&width=50'
                                }
                                alt={product.name}
                                width={48}
                                height={48}
                                className="max-h-full max-w-full object-contain"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate group-hover:text-green-600">
                                {product.name}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-bold text-green-600">
                                  Rp {product.price.toLocaleString()}
                                </span>
                                <span>•</span>
                                <span>Stok: {product.stock}</span>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 text-xs text-green-600 border-green-200 hover:bg-green-600 hover:text-white"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Tambah
                            </Button>
                          </>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="p-4 lg:p-6 flex flex-col min-h-[50vh] lg:min-h-0">
            <Card className="w-full h-full flex flex-col">
              <CardHeader className="pb-4 border-b">
                <CardTitle className="flex items-center gap-2 text-xl font-bold">
                  <ShoppingCart className="h-6 w-6 text-green-600" />
                  Produk Terpilih ({scannedProducts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col pt-4">
                {scannedProducts.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                    <ShoppingCart className="h-20 w-20 mb-4 opacity-20 text-muted-foreground" />
                    <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-1">Belum ada produk dipilih</p>
                    <p className="text-xs text-muted-foreground max-w-xs">
                      Klik produk pada katalog di sebelah kiri untuk memasukkannya ke keranjang transaksi.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto">
                    <div className="space-y-4">
                      {scannedProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-md"
                        >
                          <div className="flex items-center gap-4 flex-1 w-full">
                            <Image
                              src={
                                product.image ||
                                '/placeholder.svg?height=60&width=60'
                              }
                              alt={product.name}
                              width={60}
                              height={60}
                              className="rounded-md object-cover"
                            />
                            <div className="flex-1">
                              <h3 className="font-medium">{product.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                Rp {product.price.toLocaleString()}
                              </p>
                              {product.category && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  {product.category.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  updateProductQuantity(
                                    product.id,
                                    (product.quantity || 1) - 1
                                  )
                                }
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-8 text-center font-medium">
                                {product.quantity || 1}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  updateProductQuantity(
                                    product.id,
                                    (product.quantity || 1) + 1
                                  )
                                }
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => removeProductFromCart(product.id)}
                            >
                              Hapus
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="border-t bg-white p-4 shadow-lg">
        {authenticatedUser && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center max-w-7xl mx-auto">
            <div className="flex flex-col">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pengguna:</span>
                <span className="font-semibold">
                  {authenticatedUser.role === 'santri'
                    ? authenticatedUser.nama_santri || 'Nama tidak ditemukan'
                    : authenticatedUser.username || 'Username tidak ditemukan'}
                </span>
              </div>
              {authenticatedUser.role === 'santri' &&
                authenticatedUser.balance && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Sisa Saldo:</span>
                    <span className="font-semibold text-green-600">
                      Rp{' '}
                      {(authenticatedUser.balance.amount || 0).toLocaleString()}
                    </span>
                  </div>
                )}
              {authenticatedUser.role === 'santri' &&
                authenticatedUser.kelas && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Kelas:</span>
                    <span className="font-medium">
                      {authenticatedUser.kelas}
                    </span>
                  </div>
                )}
              {authenticatedUser.role === 'santri' &&
                authenticatedUser.unit && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Unit:</span>
                    <span className="font-medium">
                      {authenticatedUser.unit}
                    </span>
                  </div>
                )}
            </div>

            <div className="flex justify-between items-center text-sm md:justify-self-center">
              <span className="text-muted-foreground mr-2">Total Item:</span>
              <span className="font-semibold">{scannedProducts.length}</span>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-4">
              <div className="text-right">
                <span className="text-sm text-muted-foreground">
                  Total Harga
                </span>
                <p className="text-2xl font-bold">
                  Rp {totalPrice.toLocaleString()}
                </p>
                {authenticatedUser.role === 'santri' &&
                  authenticatedUser.balance &&
                  totalPrice > authenticatedUser.balance.amount && (
                    <p className="text-xs text-red-500">
                      Saldo tidak mencukupi
                    </p>
                  )}
              </div>
              <Button
                size="lg"
                disabled={
                  scannedProducts.length === 0 ||
                  isLoading ||
                  (authenticatedUser.role === 'santri' &&
                    authenticatedUser.balance &&
                    totalPrice > authenticatedUser.balance.amount)
                }
                // 👇 Update this line
                onClick={handlePayButtonClick}
                className="px-8 py-6 text-base"
              >
                {isLoading ? 'Memproses...' : 'Bayar'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {renderProductModal()}

      <AlertDialog open={showPaymentResult} onOpenChange={setShowPaymentResult}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {paymentResult?.success ? (
                <CheckCircle className="h-6 w-6 text-green-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
              {paymentResult?.success
                ? 'Pembayaran Berhasil!'
                : 'Pembayaran Gagal!'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-muted-foreground text-sm">
                {paymentResult?.message}
                {paymentResult?.success &&
                  paymentResult.newBalance !== undefined && (
                    <div className="mt-2 font-medium">
                      Saldo baru: Rp {paymentResult.newBalance.toLocaleString()}
                    </div>
                  )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return (
    <div className="h-screen w-full bg-background">
      {authFlow === 'options' && renderLoginOptions()}
      {authFlow === 'face-id' && renderFaceIdLogin()}
      {authFlow === 'dashboard' && renderDashboard()}
      {renderKasirLoginModal()}

      {/* 👇 Add these two lines */}
      {renderPaymentMethodModal()}
      {renderQrisModal()}
      {renderScanResultModal()}
    </div>
  );
}
