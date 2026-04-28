"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export default function MemberPage() {
  const router = useRouter()

  const handleBackToHome = () => {
    router.push("/")
  }

  const handleKaryawanAccess = () => {
    router.push("/Member/Karyawan")
  }

  const handleSantriAccess = () => {
    router.push("/Member/Santri")
  }

  const handleNonSantriAccess = () => {
    router.push("/Member/Non-Santri")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={handleBackToHome} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Beranda
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pilih Jenis Akses</h1>
              <p className="text-sm text-gray-600">Pilih kategori akses yang sesuai dengan status Anda</p>
            </div>
          </div>
        </div>
      </div>

      {/* Member Selection Cards */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* PPMI ASSALAAM Card - Left */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 hover:border-blue-300"
            onClick={handleKaryawanAccess}
          >
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Image
                  src="/icons/Karyawan.png"
                  alt="PPMI ASSALAAM"
                  width={80}
                  height={80}
                  className="object-contain"
                />
              </div>
              <CardTitle className="text-2xl text-blue-700">PPMI ASSALAAM</CardTitle>
              <CardDescription className="text-base">Akses khusus untuk karyawan PPMI Assalaam</CardDescription>
            </CardHeader>
            <CardContent className="text-center pt-0">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg">
                Masuk Sebagai Karyawan
              </Button>
            </CardContent>
          </Card>

          {/* SANTRI DAN VIP MEMBER Card - Center */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 hover:border-green-300"
            onClick={handleSantriAccess}
          >
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Image
                  src="/icons/Icons.png"
                  alt="Santri dan VIP Member"
                  width={80}
                  height={80}
                  className="object-contain"
                />
              </div>
              <CardTitle className="text-2xl text-green-700">SANTRI DAN VIP MEMBER</CardTitle>
              <CardDescription className="text-base">Akses khusus Santri dan VIP Member</CardDescription>
            </CardHeader>
            <CardContent className="text-center pt-0">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg">Scan Face ID</Button>
            </CardContent>
          </Card>

          {/* MEMBERSHIP Card - Right */}
          <Card
            className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 hover:border-blue-300"
            onClick={handleNonSantriAccess}
          >
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <Image
                  src="/icons/Member Umum.png"
                  alt="Membership"
                  width={80}
                  height={80}
                  className="object-contain"
                />
              </div>
              <CardTitle className="text-2xl text-blue-700">MEMBERSHIP</CardTitle>
              <CardDescription className="text-base">
                Akses khusus Membership Assalaam Olympic Pool Stadium
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center pt-0">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg">Scan Face ID</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
