'use client';
import {
  Home,
  User,
  Package,
  ShoppingCart,
  BarChart3,
  LogIn,
  CreditCard,
  Ticket,
  Settings,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavUser } from '@/components/nav-user';

// Sample logo component
const PKasirLogo = () => (
  <div className="flex items-center justify-center py-4">
    {/* <div className="flex items-center gap-2">
      <ShoppingCart className="h-6 w-6 text-red-500" />
      <span className="text-xl font-bold">PKasir</span>
    </div> */}
  </div>
);

// Attendance menu items (only for admin) - Always open, no collapsible
const attendanceMenuItems = [
  {
    title: 'Kelola Yayasan MPI',
    url: '/Admin/yayasan',
    icon: User,
  },
  {
    title: 'Kelola Staff',
    url: '/Admin/staff',
    icon: User,
  },
  {
    title: 'Kelola Santri',
    url: '/Admin/santri',
    icon: User,
  },
  {
    title: 'Kelola Member',
    url: '/Admin/member',
    icon: User,
  },
  {
    title: 'Kelola User',
    url: '/Admin/user',
    icon: User,
  },
  {
    title: 'Penjualan',
    url: '/Admin/penjualan',
    icon: BarChart3,
  },
  {
    title: 'Ticket',
    url: '/Admin/tickets',
    icon: Ticket,
  },
  {
    title: 'Settings',
    url: '/Admin/settings',
    icon: Settings,
  },
];

// Navigation data for kasir (logged-in)
const kasirNavData = [
  {
    title: 'Product',
    url: '/Admin/products',
    icon: Package,
  },
  {
    title: 'Transaction',
    url: '/Admin/transactions',
    icon: ShoppingCart,
  },
  {
    title: 'Top-up',
    url: '/Admin/topup',
    icon: CreditCard,
  },
];

// Navigation data for admin (logged-in)
const adminNavData = [
  {
    title: 'Product',
    url: '/Admin/products',
    icon: Package,
  },
  {
    title: 'Transaction',
    url: '/Admin/transactions',
    icon: ShoppingCart,
  },
  {
    title: 'Top-up',
    url: '/Admin/topup',
    icon: CreditCard,
  },
  {
    title: 'Report',
    url: '/Admin/reports',
    icon: BarChart3,
  },
];

// Navigation data for guests (not logged-in)
const guestNavData = [
  {
    title: '',
    url: '/',
    icon: Home,
  },
];

interface AppSidebarProps {
  className?: string;
}

interface AuthData {
  token: string;
  role: 'admin' | 'kasir';
  user?: {
    name: string;
    email: string;
  };
}

export function AppSidebar({ className, ...props }: AppSidebarProps) {
  const { isMobile, setOpen: setSidebarOpen } = useSidebar();
  const [authData, setAuthData] = useState<AuthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to decode JWT token
  const decodeJWTToken = (token: string) => {
    try {
      // JWT has 3 parts separated by dots
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      // Decode the payload (second part)
      const payload = parts[1];
      // Add padding if needed
      const paddedPayload =
        payload + '='.repeat((4 - (payload.length % 4)) % 4);
      const decodedPayload = atob(
        paddedPayload.replace(/-/g, '+').replace(/_/g, '/')
      );

      return JSON.parse(decodedPayload);
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return null;
    }
  };

  // Check authentication status from localStorage
  useEffect(() => {
    const checkAuth = () => {
      try {
        const authToken = localStorage.getItem('authToken');

        if (authToken) {
          // Parse the token if it's a JSON string containing user data
          try {
            const parsedAuth = JSON.parse(authToken) as AuthData;
            setAuthData(parsedAuth);
          } catch {
            // If token is JWT, try to decode it
            const decodedToken = decodeJWTToken(authToken);
            let userRole: 'admin' | 'kasir' = 'kasir';
            let userName = 'User';
            let userEmail = 'user@pkasir.com';

            if (decodedToken) {
              // Debug: log the decoded token to see available fields
              console.log('Decoded JWT Token:', decodedToken);

              // Try different possible field names for role
              userRole =
                decodedToken.role ||
                decodedToken.user_role ||
                decodedToken.authority ||
                decodedToken.permissions ||
                decodedToken.type ||
                'kasir';
              userName =
                decodedToken.name ||
                decodedToken.username ||
                decodedToken.user_name ||
                decodedToken.full_name ||
                (userRole === 'admin' ? 'Admin' : 'Kasir');
              userEmail =
                decodedToken.email ||
                decodedToken.user_email ||
                decodedToken.mail ||
                (userRole === 'admin'
                  ? 'admin@pkasir.com'
                  : 'kasir@pkasir.com');

              console.log('Extracted role:', userRole);
              console.log('Extracted name:', userName);
            } else {
              // Fallback to localStorage items
              userRole =
                (localStorage.getItem('userRole') as 'admin' | 'kasir') ||
                'kasir';
              userName =
                localStorage.getItem('userName') ||
                (userRole === 'admin' ? 'Admin' : 'Kasir');
              userEmail =
                localStorage.getItem('userEmail') ||
                (userRole === 'admin'
                  ? 'admin@pkasir.com'
                  : 'kasir@pkasir.com');
            }

            setAuthData({
              token: authToken,
              role: userRole,
              user: {
                name: userName,
                email: userEmail,
              },
            });
          }
        } else {
          setAuthData(null);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setAuthData(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for storage changes (for when user logs in/out in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authToken') {
        checkAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <Sidebar collapsible="icon" className={className} {...props}>
        <SidebarHeader>
          <PKasirLogo />
        </SidebarHeader>
        <SidebarContent>
          <div className="flex items-center justify-center p-4">
            <div className="text-sm text-gray-500">Loading...</div>
          </div>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
    );
  }

  const isLoggedIn = !!authData;
  const isAdmin = authData?.role === 'admin';
  const role = authData?.role || 'guest';

  const getNavData = () => {
    if (!isLoggedIn) return guestNavData;
    if (role === 'admin') return adminNavData;
    if (role === 'kasir') return kasirNavData;
    return guestNavData;
  };

  const navData = getNavData();
  const showAttendanceMenu = isLoggedIn && isAdmin;

  // Render attendance menu - always open for admin (no collapsible)
  const renderAttendanceMenu = () => {
    if (!showAttendanceMenu) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel>Attendance</SidebarGroupLabel>
        <SidebarMenu>
          {attendanceMenuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton tooltip={item.title} asChild>
                <a
                  href={item.url}
                  onClick={() => isMobile && setSidebarOpen(false)}
                >
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    );
  };

  const handleLogout = () => {
    console.log('Logging out...'); // Tambahkan ini
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    setAuthData(null);
    window.location.href = '/login';
  };

  return (
    <Sidebar collapsible="icon" className={className} {...props}>
      <SidebarHeader>
        <PKasirLogo />
      </SidebarHeader>
      <SidebarContent>
        {/* Attendance menu */}
        {renderAttendanceMenu()}

        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarMenu>
            {navData.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton tooltip={item.title} asChild>
                  <a
                    href={item.url}
                    onClick={() => isMobile && setSidebarOpen(false)}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      {!isLoggedIn && (
        <SidebarFooter>
          <div className="px-2 pb-4">
            <a
              href="/login"
              className="flex items-center justify-center w-full p-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Login
            </a>
          </div>
        </SidebarFooter>
      )}
      {isLoggedIn && (
        <SidebarFooter>
          <NavUser
            user={{
              name: authData.user?.name || (isAdmin ? 'Admin' : 'Kasir'),
              email:
                authData.user?.email ||
                (isAdmin ? 'admin@pkasir.com' : 'kasir@pkasir.com'),
              avatar: '/placeholder.svg?height=40&width=40',
            }}
            onLogout={handleLogout}
          />
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  );
}
