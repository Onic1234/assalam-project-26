"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Search, Download, PlusCircle, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

// Konfigurasi URL dasar API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Interface Tiket di frontend
interface Ticket {
  id: string;
  type: "Reguler" | "Karyawan";
  price: number;
  description: string;
  isActive: boolean;
  discountPercentage?: number;
}

// Fungsi untuk mengirim data ke endpoint backend untuk mengatur harga.
const setTicketPriceAPI = async (
  type: "Reguler" | "Karyawan",
  price: number,
  discountPercentage?: number // Tambahkan parameter diskon opsional
) => {
  const token = localStorage.getItem("authToken");
  if (!token) {
    throw new Error(
      "Token autentikasi tidak ditemukan. Silakan login kembali."
    );
  }

  const kategori = type === "Karyawan" ? "Staff" : "Reguler";

  const response = await fetch(`${API_BASE_URL}/ticketing/prices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    // Sertakan `discountPercentage` dalam body permintaan ke backend.
    body: JSON.stringify({ kategori, harga: price, discountPercentage }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Gagal memperbarui harga tiket.");
  }

  return response.json();
};

export default function TicketManagementPage() {
  const { toast } = useToast();
  // Mulai dengan array kosong, karena data akan diambil dari API.
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Tambahkan status loading

  // Status dialog tetap sama
  const [isAddTicketDialogOpen, setIsAddTicketDialogOpen] = useState(false);
  const [newTicketType, setNewTicketType] = useState<"Reguler" | "Karyawan">(
    "Reguler"
  );
  const [newTicketPrice, setNewTicketPrice] = useState("");
  const [newTicketDescription, setNewTicketDescription] = useState("");
  const [newTicketDiscount, setNewTicketDiscount] = useState("");

  const [isEditTicketDialogOpen, setIsEditTicketDialogOpen] = useState(false);
  const [editedTicketId, setEditedTicketId] = useState<string | null>(null);
  const [editedTicketPrice, setEditedTicketPrice] = useState("");
  const [editedTicketDescription, setEditedTicketDescription] = useState("");
  const [editedTicketDiscount, setEditedTicketDiscount] = useState("");

  // Ambil harga tiket awal dari backend saat komponen dimuat.
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem("authToken"); // Atau di mana pun Anda menyimpan token
        if (!token) {
          throw new Error("Token autentikasi tidak ditemukan.");
        }

        const response = await fetch(`${API_BASE_URL}/ticketing/prices`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error("Gagal mengambil harga tiket.");
        }
        const prices = await response.json();

        // Petakan data API ke interface Tiket di frontend
        const formattedTickets: Ticket[] = prices.map(
          (p: any, index: number) => ({
            id: `TKT-${p.kategori.substring(0, 3).toUpperCase()}-${String(
              index + 1
            ).padStart(3, "0")}`,
            type: p.kategori === "Staff" ? "Karyawan" : "Reguler",
            price: p.harga,
            description: `Deskripsi untuk ${p.kategori}`,
            isActive: true,
            // Petakan `discountPercentage` dari respons API ke state
            discountPercentage: p.discountPercentage || 0,
          })
        );

        setTickets(formattedTickets);
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickets();
  }, [toast]);

  const handleAddTicket = async () => {
    if (!newTicketPrice || !newTicketDescription) {
      toast({
        title: "Error",
        description: "Harga dan deskripsi tiket harus diisi.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Pertama, perbarui harga di backend
      await setTicketPriceAPI(
        newTicketType,
        Number.parseFloat(newTicketPrice),
        Number.parseFloat(newTicketDiscount) || 0
      );

      // Jika berhasil, perbarui status lokal
      const newId = `TKT-${newTicketType
        .substring(0, 3)
        .toUpperCase()}-${String(tickets.length + 1).padStart(3, "0")}`;
      const newTicket: Ticket = {
        id: newId,
        type: newTicketType,
        price: Number.parseFloat(newTicketPrice),
        description: newTicketDescription,
        isActive: true,
        discountPercentage: Number.parseFloat(newTicketDiscount) || 0,
      };

      setTickets((prev) => [...prev, newTicket]);
      toast({
        title: "Success",
        description: `Tiket ${newTicketType} berhasil ditambahkan.`,
      });
      setIsAddTicketDialogOpen(false);
      setNewTicketPrice("");
      setNewTicketDescription("");
      setNewTicketDiscount("");
    } catch (error: any) {
      toast({
        title: "API Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleOpenEditTicketDialog = (ticket: Ticket) => {
    setEditedTicketId(ticket.id);
    setEditedTicketPrice(ticket.price.toString());
    setEditedTicketDescription(ticket.description);
    setEditedTicketDiscount(ticket.discountPercentage?.toString() || "0");
    setIsEditTicketDialogOpen(true);
  };

  const handleEditTicket = async () => {
    const originalTicket = tickets.find((t) => t.id === editedTicketId);
    if (
      !editedTicketId ||
      !editedTicketPrice ||
      !editedTicketDescription ||
      !originalTicket
    ) {
      toast({
        title: "Error",
        description: "Harga dan deskripsi tiket harus diisi.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Pertama, perbarui harga di backend
      await setTicketPriceAPI(
        originalTicket.type,
        Number.parseFloat(editedTicketPrice),
        Number.parseFloat(editedTicketDiscount) || 0
      );

      // Jika berhasil, perbarui status lokal
      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === editedTicketId
            ? {
                ...ticket,
                price: Number.parseFloat(editedTicketPrice),
                description: editedTicketDescription,
                discountPercentage:
                  Number.parseFloat(editedTicketDiscount) || 0,
              }
            : ticket
        )
      );
      toast({
        title: "Success",
        description: "Tiket berhasil diperbarui.",
      });
      setIsEditTicketDialogOpen(false);
      setEditedTicketId(null);
    } catch (error: any) {
      toast({
        title: "API Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleTicketStatus = (id: string) => {
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === id ? { ...ticket, isActive: !ticket.isActive } : ticket
      )
    );
    toast({
      title: "Status Diperbarui",
      description: "Status tiket berhasil diperbarui.",
    });
  };

  const calculateDiscountedPrice = (
    price: number,
    discountPercentage?: number
  ) => {
    if (discountPercentage && discountPercentage > 0) {
      return price * (1 - discountPercentage / 100);
    }
    return price;
  };

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
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto h-8 gap-1 bg-transparent"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline-block">Export</span>
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1"
              onClick={() => setIsAddTicketDialogOpen(true)}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline-block">Add Ticket</span>
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList>
                <TabsTrigger value="all">All Tickets</TabsTrigger>
                {/* <TabsTrigger value="reguler">Reguler</TabsTrigger>
                <TabsTrigger value="karyawan">Karyawan</TabsTrigger> */}
              </TabsList>
              <TabsContent value="all">
                <Card>
                  <CardHeader>
                    <CardTitle>All Tickets</CardTitle>
                    <CardDescription>
                      Manage all available ticket types.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3">
                              ID Tiket
                            </th>
                            <th scope="col" className="px-6 py-3">
                              Tipe
                            </th>
                            <th scope="col" className="px-6 py-3">
                              Harga
                            </th>
                            <th scope="col" className="px-6 py-3">
                              Diskon (%)
                            </th>
                            <th scope="col" className="px-6 py-3">
                              Harga Akhir
                            </th>
                            <th scope="col" className="px-6 py-3">
                              Deskripsi
                            </th>
                            <th scope="col" className="px-6 py-3">
                              Aksi
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {tickets.map((ticket) => (
                            <tr
                              key={ticket.id}
                              className="bg-white border-b hover:bg-gray-50"
                            >
                              <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                {ticket.id}
                              </td>
                              <td className="px-6 py-4">{ticket.type}</td>
                              <td className="px-6 py-4">
                                Rp {ticket.price.toLocaleString("id-ID")}
                              </td>
                              <td className="px-6 py-4">
                                {ticket.discountPercentage || 0}%
                              </td>
                              <td className="px-6 py-4 font-semibold">
                                Rp{" "}
                                {calculateDiscountedPrice(
                                  ticket.price,
                                  ticket.discountPercentage
                                ).toLocaleString("id-ID")}
                              </td>
                              <td className="px-6 py-4">
                                {ticket.description}
                              </td>
                              <td className="px-6 py-4 flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleOpenEditTicketDialog(ticket)
                                  }
                                >
                                  <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              {/* TabsContent untuk Reguler dan Karyawan tetap sama */}
            </Tabs>
          )}
        </main>

        {/* Add Ticket Dialog */}
        <Dialog
          open={isAddTicketDialogOpen}
          onOpenChange={setIsAddTicketDialogOpen}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Ticket</DialogTitle>
              <DialogDescription>
                Fill in the details for the new ticket type.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="ticketType" className="text-right">
                  Type
                </Label>
                <RadioGroup
                  id="ticketType"
                  value={newTicketType}
                  onValueChange={(value: "Reguler" | "Karyawan") =>
                    setNewTicketType(value)
                  }
                  className="col-span-3 flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Reguler" id="r1" />
                    <Label htmlFor="r1">Reguler</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Karyawan" id="r2" />
                    <Label htmlFor="r2">Karyawan</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">
                  Price
                </Label>
                <Input
                  id="price"
                  type="number"
                  value={newTicketPrice}
                  onChange={(e) => setNewTicketPrice(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., 25000"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="discount" className="text-right">
                  Discount (%)
                </Label>
                <Input
                  id="discount"
                  type="number"
                  value={newTicketDiscount}
                  onChange={(e) => setNewTicketDiscount(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., 10 (for 10%)"
                  min="0"
                  max="100"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Input
                  id="description"
                  value={newTicketDescription}
                  onChange={(e) => setNewTicketDescription(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., Full access to swimming pool facilities."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddTicketDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddTicket}>Add Ticket</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Ticket Dialog */}
        <Dialog
          open={isEditTicketDialogOpen}
          onOpenChange={setIsEditTicketDialogOpen}
        >
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Ticket</DialogTitle>
              <DialogDescription>
                Update the details for the selected ticket.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editPrice" className="text-right">
                  Price
                </Label>
                <Input
                  id="editPrice"
                  type="number"
                  value={editedTicketPrice}
                  onChange={(e) => setEditedTicketPrice(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., 25000"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editDiscount" className="text-right">
                  Discount (%)
                </Label>
                <Input
                  id="editDiscount"
                  type="number"
                  value={editedTicketDiscount}
                  onChange={(e) => setEditedTicketDiscount(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., 10 (for 10%)"
                  min="0"
                  max="100"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editDescription" className="text-right">
                  Description
                </Label>
                <Input
                  id="editDescription"
                  value={editedTicketDescription}
                  onChange={(e) => setEditedTicketDescription(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., Full access to swimming pool facilities."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditTicketDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleEditTicket}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
