'use client';
import React, { useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

export default function AssetsLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check authentication status on mount
    const authStatus = sessionStorage.getItem('asset_authenticated');
    setIsAuthenticated(authStatus === 'true');
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Simulate a brief delay for standard flow
    setTimeout(() => {
      if (username === 'admin_asset' && password === 'assalam_asset') {
        sessionStorage.setItem('asset_authenticated', 'true');
        setIsAuthenticated(true);
      } else {
        setError('Username atau password salah.');
      }
      setLoading(false);
    }, 500);
  };

  const handleBackToDashboard = () => {
    window.location.href = '/Admin/products'; // Redirect to main dashboard area
  };

  // While checking authentication, show a clean loading screen
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not authenticated, show the clean/simple login screen matching main login page
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4 sm:p-6 lg:p-8">
        <div className="w-full flex justify-center">
          <Card className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl">
            <CardHeader className="text-center space-y-4 sm:space-y-6 py-6 sm:py-8 lg:py-12">
              <div className="flex justify-center mb-4 sm:mb-6 lg:mb-8">
                <div className="flex items-center gap-3 sm:gap-4">
                  <Image
                    src="/icons/Logo AOPS.png"
                    alt="AOPS Logo"
                    width={125}
                    height={125}
                    className="object-contain"
                  />
                </div>
              </div>
              <CardTitle className="text-xl sm:text-2xl lg:text-3xl">
                Asset Portal Login
              </CardTitle>
              <CardDescription className="text-sm sm:text-base lg:text-lg max-w-xs sm:max-w-sm lg:max-w-md mx-auto px-2">
                Enter your credentials to access the asset management dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 sm:px-8 lg:px-16 pb-6 sm:pb-8">
              <div className="w-full max-w-sm mx-auto">
                <form onSubmit={handleLogin}>
                  <div className="space-y-4 sm:space-y-6 lg:space-y-8">
                    {error && (
                      <p className="text-center text-sm text-red-500 bg-red-100 p-2 rounded-md">
                        {error}
                      </p>
                    )}
                    <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                      <Label
                        htmlFor="username"
                        className="text-sm sm:text-base lg:text-lg font-medium"
                      >
                        Username
                      </Label>
                      <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="h-10 sm:h-12 lg:h-14 text-sm sm:text-base lg:text-lg"
                        placeholder="Enter your username"
                        required
                      />
                    </div>
                    <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                      <Label
                        htmlFor="password"
                        className="text-sm sm:text-base lg:text-lg font-medium"
                      >
                        Password
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-10 sm:h-12 lg:h-14 text-sm sm:text-base lg:text-lg"
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-10 sm:h-12 lg:h-14 text-sm sm:text-base lg:text-lg font-medium mt-4 sm:mt-6 lg:mt-8"
                      disabled={loading || !username || !password}
                    >
                      {loading ? 'Logging in...' : 'Login'}
                    </Button>
                  </div>
                </form>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-center justify-center pb-6 sm:pb-8 lg:pb-12">
              <div className="w-full max-w-sm border-t pt-4">
                <Button
                  variant="ghost"
                  onClick={handleBackToDashboard}
                  className="w-full h-10 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Kembali ke Dashboard Utama
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // If authenticated, render sidebar and layout children as normal
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col w-full max-w-full overflow-hidden">
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
