'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Trash2, ShieldAlert } from 'lucide-react';

// --- INTERFACE UPDATED TO MATCH BACKEND ---
// This interface now correctly reflects the data sent from your server.
interface Transaction {
  id: number;
  total_amount: number;
  payment_method: 'TopUp' | 'Saldo' | 'Tunai' | 'QRIS';
  createdAt: string;
  santri?: {
    nama_santri: string;
    id_santri: string; // This is the NIS
  };
}

// --- PROPS INTERFACE UPDATED ---
// Added `loading` and `onUpdate` for better functionality.
interface TransactionsTableProps {
  transactions: Transaction[];
  loading: boolean;
  onUpdate: () => void; // Function from parent to refresh data
}

export function TransactionsTable({
  transactions,
  loading,
  onUpdate,
}: TransactionsTableProps) {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // --- ACTION HANDLERS IMPLEMENTED ---

  // Function to handle viewing transaction details
  const handleViewDetails = (transaction: Transaction) => {
    const details = `
      Transaction ID: ${transaction.id}
      Customer: ${transaction.santri?.nama_santri || 'Cashier Sale'}
      NIS: ${transaction.santri?.id_santri || 'N/A'}
      Amount: ${formatCurrency(transaction.total_amount)}
      Type: ${transaction.payment_method}
      Date: ${formatDate(transaction.createdAt)}
    `;
    alert(details); // Shows a simple alert with details
  };

  // Function to handle deleting a transaction
  // const handleDelete = async (transactionId: number) => {
  //   if (
  //     !confirm(
  //       'Are you sure you want to delete this transaction? The action cannot be undone.'
  //     )
  //   ) {
  //     return;
  //   }

  //   const token = localStorage.getItem('authToken');
  //   if (!token) {
  //     alert('Authentication error. Please log in again.');
  //     return;
  //   }

  //   try {
  //     const response = await fetch(
  //       `${API_BASE_URL}/transactions/${transactionId}`,
  //       {
  //         method: 'DELETE',
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //         },
  //       }
  //     );

  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       throw new Error(errorData.message || 'Failed to delete transaction.');
  //     }

  //     alert('Transaction deleted successfully!');
  //     onUpdate(); // Trigger the refresh function from the parent page
  //   } catch (error) {
  //     console.error('Delete Error:', error);
  //     alert(
  //       `An error occurred: ${
  //         error instanceof Error ? error.message : 'Unknown error'
  //       }`
  //     );
  //   }
  // };

  // --- JSX UPDATED TO RENDER CORRECT DATA ---

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                Loading transactions...
              </TableCell>
            </TableRow>
          ) : transactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                No transactions found for the selected filters.
              </TableCell>
            </TableRow>
          ) : (
            transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-mono">#{transaction.id}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">
                      {/* Correctly displays Santri name or a fallback */}
                      {transaction.santri?.nama_santri || 'Cashier Sale'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {/* Correctly displays NIS or a fallback */}
                      {transaction.santri?.id_santri || 'No NIS'}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {/* Correctly displays payment method */}
                  <Badge
                    variant={
                      transaction.payment_method === 'TopUp'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {transaction.payment_method}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatCurrency(transaction.total_amount)}
                </TableCell>
                <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end space-x-1">
                    {/* onClick handlers are now attached */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewDetails(transaction)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {/* <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-500"
                      onClick={() => handleDelete(transaction.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button> */}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
