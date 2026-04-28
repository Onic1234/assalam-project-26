import { Loader2 } from 'lucide-react';
import { AppSidebar } from '@/components/app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function TicketsLoading() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center border-b px-4 md:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-6"
            />
            <h1 className="text-lg font-semibold">Ticket Management</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative w-full md:w-64 lg:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search tickets..."
                className="w-full rounded-lg bg-background pl-8 md:w-64 lg:w-80"
                disabled
              />
            </div>
          </div>
        </header>
        <div className="flex h-[calc(100svh-4rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
