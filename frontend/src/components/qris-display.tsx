"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QrCode, RefreshCw, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// --- PENGATURAN API ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

// Interface untuk QRIS data
interface QrisData {
  key: string
  value: string // Base64 data URL
}

// Interface untuk response API
interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
}

// Props untuk komponen QrisDisplay
interface QrisDisplayProps {
  /** Custom className untuk styling */
  className?: string
  /** Ukuran gambar QRIS */
  size?: "sm" | "md" | "lg" | "xl"
  /** Tampilkan header card atau tidak */
  showHeader?: boolean
  /** Custom title untuk header */
  title?: string
  /** Custom description untuk header */
  description?: string
  /** Tampilkan tombol refresh atau tidak */
  showRefresh?: boolean
  /** Callback ketika QRIS berhasil dimuat */
  onLoad?: (qrisData: QrisData) => void
  /** Callback ketika terjadi error */
  onError?: (error: string) => void
  /** Mode tampilan: card atau image-only */
  variant?: "card" | "image-only"
  /** Custom styling untuk container gambar */
  imageClassName?: string
}

// Mapping ukuran
const sizeMap = {
  sm: "max-w-32 max-h-32",
  md: "max-w-48 max-h-48",
  lg: "max-w-64 max-h-64",
  xl: "max-w-80 max-h-80",
}

export function QrisDisplay({
  className,
  size = "md",
  showHeader = true,
  title = "Pembayaran QRIS",
  description = "Scan kode QR di bawah untuk melakukan pembayaran",
  showRefresh = false,
  onLoad,
  onError,
  variant = "card",
  imageClassName,
}: QrisDisplayProps) {
  const [qrisData, setQrisData] = useState<QrisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch QRIS data
  const fetchQrisData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/settings/qris`, {
        method: "GET",
      })

      if (response.status === 404) {
        const errorMsg = "QRIS belum diatur oleh admin"
        setError(errorMsg)
        onError?.(errorMsg)
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result: ApiResponse<QrisData> = await response.json()

      if (result.success && result.data) {
        setQrisData(result.data)
        onLoad?.(result.data)
      } else {
        const errorMsg = "Gagal memuat QRIS"
        setError(errorMsg)
        onError?.(errorMsg)
      }
    } catch (err) {
      console.error("Error fetching QRIS data:", err)
      const errorMsg = "Gagal memuat QRIS. Periksa koneksi internet."
      setError(errorMsg)
      onError?.(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQrisData()
  }, [])

  // Handle refresh
  const handleRefresh = () => {
    fetchQrisData()
    if (showRefresh) {
      toast({
        title: "Info",
        description: "Memperbarui QRIS...",
      })
    }
  }

  // Render loading state
  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center py-8">
      <RefreshCw className="h-8 w-8 animate-spin mb-2 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Memuat QRIS...</p>
    </div>
  )

  // Render error state
  const renderError = () => (
    <div className="flex flex-col items-center justify-center py-8">
      <AlertCircle className="h-8 w-8 mb-2 text-destructive" />
      <p className="text-sm text-destructive text-center mb-3">{error}</p>
      {showRefresh && (
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Coba Lagi
        </Button>
      )}
    </div>
  )

  // Render QRIS image
  const renderQrisImage = () => (
    <div className="flex justify-center">
      <div className={cn("border rounded-lg p-4 bg-white shadow-sm", imageClassName)}>
        <img
          src={qrisData?.value || "/placeholder.svg"}
          alt="QRIS Payment Code"
          className={cn("object-contain", sizeMap[size])}
          onError={(e) => {
            console.error("Error loading QRIS image")
            const target = e.target as HTMLImageElement
            target.src = "/placeholder.svg?height=200&width=200&text=QRIS+Error"
          }}
        />
      </div>
    </div>
  )

  // Render content berdasarkan state
  const renderContent = () => {
    if (loading) return renderLoading()
    if (error) return renderError()
    if (qrisData) return renderQrisImage()
    return renderError()
  }

  // Jika variant image-only, return hanya gambar
  if (variant === "image-only") {
    return <div className={cn("w-full", className)}>{renderContent()}</div>
  }

  // Render dengan card wrapper
  return (
    <Card className={cn("w-full", className)}>
      {showHeader && (
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <QrCode className="h-5 w-5" />
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
          {showRefresh && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          )}
        </CardHeader>
      )}
      <CardContent>{renderContent()}</CardContent>
    </Card>
  )
}

// Export default untuk kemudahan import
export default QrisDisplay
