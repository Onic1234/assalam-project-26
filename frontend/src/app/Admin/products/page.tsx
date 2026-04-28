'use client';

import { useState, useEffect } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  Grid,
  List,
  Plus,
  Search,
  Tag,
  Trash2,
  Edit,
  Loader2,
  AlertCircle,
  Package,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

// --- INTERFACES (camelCase for data from API) ---
interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  categoryId?: number;
  category?: {
    id: number;
    name: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface Category {
  id: number;
  name: string;
  productCount?: number;
  products?: Product[];
  createdAt?: string;
  updatedAt?: string;
}

// --- API RESPONSE INTERFACES ---
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface ProductsResponse {
  products: Product[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

// --- API CONFIGURATION ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ProductsPage() {
  // --- STATE MANAGEMENT ---
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] =
    useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null
  );

  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 12,
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');

  // **CORRECTED**: Form states now use camelCase
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    stock: '',
    categoryId: '',
  });
  const [categoryForm, setCategoryForm] = useState({ name: '' });

  // --- AUTHENTICATION HELPER ---
  const getAuthHeaders = (includeContentType = true) => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const headers: HeadersInit = {
      Authorization: `Bearer ${token}`,
    };
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  };

  // --- API FUNCTIONS ---
  const handleApiError = (err: any, defaultMessage: string) => {
    console.error('API Error:', err);
    const errorMessage =
      err.message ||
      (err.error ? `${err.error}: ${err.message}` : defaultMessage);
    setError(errorMessage);
    toast.error(errorMessage);
  };

  // Product API functions
  const fetchProducts = async (page = 1, search = '', categoryId = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        includeCategory: 'true',
        sortBy: 'updatedAt',
        sortOrder: 'DESC',
        ...(search && { search }),
        // Using 'categoryId' which is more standard, but ensure backend supports it.
        // If backend strictly requires 'category_id', this can be reverted.
        ...(categoryId && categoryId !== 'all' && { categoryId }),
      });
      const response = await fetch(`${API_BASE_URL}/products?${params}`);
      const data: ApiResponse<ProductsResponse> = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch products');
      }
      setProducts(data.data.products || []);
      setPagination(data.data.pagination);
    } catch (err) {
      handleApiError(err, 'Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  };

  const createProduct = async () => {
    if (!validateProductForm()) return;
    setIsSubmitting(true);
    try {
      // **CORRECTED**: Payload uses camelCase keys
      const payload = {
        name: productForm.name,
        price: Number.parseFloat(productForm.price),
        stock: Number.parseInt(productForm.stock),
        categoryId: productForm.categoryId
          ? Number(productForm.categoryId)
          : null,
      };
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw data;
      toast.success(data.message);
      await fetchProducts(currentPage, searchQuery, selectedCategoryFilter);
      setIsAddProductOpen(false);
      resetProductForm();
    } catch (err) {
      handleApiError(err, 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateProduct = async () => {
    if (!selectedProduct || !validateProductForm()) return;
    setIsSubmitting(true);
    try {
      // **CORRECTED**: Payload uses camelCase keys
      const payload = {
        name: productForm.name,
        price: Number.parseFloat(productForm.price),
        stock: Number.parseInt(productForm.stock),
        categoryId: productForm.categoryId
          ? Number(productForm.categoryId)
          : null,
      };
      const response = await fetch(
        `${API_BASE_URL}/products/${selectedProduct.id}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) throw data;
      toast.success(data.message);
      await fetchProducts(currentPage, searchQuery, selectedCategoryFilter);
      setIsEditProductOpen(false);
      resetProductForm();
    } catch (err) {
      handleApiError(err, 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteProduct = async () => {
    if (!productToDelete) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/products/${productToDelete.id}`, // Removed force=true as it's often not needed for products
        {
          method: 'DELETE',
          headers: getAuthHeaders(false),
        }
      );
      const data = await response.json();
      if (!response.ok) throw data;
      toast.success(data.message);
      await fetchProducts(currentPage, searchQuery, selectedCategoryFilter);
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (err) {
      handleApiError(err, 'Failed to delete product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Category API functions
  const fetchCategoriesWithProductCount = async (search = '') => {
    try {
      const params = new URLSearchParams({ ...(search && { search }) });
      const response = await fetch(
        `${API_BASE_URL}/categories/product-count?${params}`,
        {
          headers: getAuthHeaders(false),
        }
      );
      const data: ApiResponse<Category[]> = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch categories');
      }
      setCategories(data.data);
    } catch (err) {
      handleApiError(err, 'Failed to fetch categories');
    }
  };

  const createCategory = async () => {
    if (!validateCategoryForm()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: getAuthHeaders(),
        // **CORRECTED**: Payload uses 'name' key
        body: JSON.stringify({ name: categoryForm.name }),
      });
      const data = await response.json();
      if (!response.ok) throw data;
      toast.success(data.message);
      await fetchCategoriesWithProductCount(categorySearchQuery);
      setIsAddCategoryOpen(false);
      resetCategoryForm();
    } catch (err) {
      handleApiError(err, 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCategory = async () => {
    if (!selectedCategory || !validateCategoryForm()) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/categories/${selectedCategory.id}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          // **CORRECTED**: Payload uses 'name' key
          body: JSON.stringify({ name: categoryForm.name }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw data;
      toast.success(data.message);
      await fetchCategoriesWithProductCount(categorySearchQuery);
      setIsEditCategoryOpen(false);
      resetCategoryForm();
    } catch (err) {
      handleApiError(err, 'Failed to update category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/categories/${categoryToDelete.id}?force=true`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(false),
        }
      );
      const data = await response.json();
      if (!response.ok) throw data;
      toast.success(data.message);
      await fetchCategoriesWithProductCount(categorySearchQuery);
      await fetchProducts(currentPage, searchQuery, selectedCategoryFilter);
      setIsDeleteCategoryDialogOpen(false);
      setCategoryToDelete(null);
    } catch (err) {
      handleApiError(err, 'Failed to delete category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const bulkDeleteCategories = async () => {
    if (selectedCategories.length === 0) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/categories/bulk-delete?force=true`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ categoryIds: selectedCategories }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw data;
      toast.success(data.message);
      await fetchCategoriesWithProductCount(categorySearchQuery);
      await fetchProducts(currentPage, searchQuery, selectedCategoryFilter);
      setIsBulkDeleteDialogOpen(false);
      setSelectedCategories([]);
      setIsSelectMode(false);
    } catch (err) {
      handleApiError(err, 'Failed to bulk delete categories');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- EFFECTS & VALIDATION ---
  useEffect(() => {
    fetchProducts(1);
    fetchCategoriesWithProductCount();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setCurrentPage(1);
      fetchProducts(1, searchQuery, selectedCategoryFilter);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery, selectedCategoryFilter]);

  useEffect(() => {
    const handler = setTimeout(
      () => fetchCategoriesWithProductCount(categorySearchQuery),
      300
    );
    return () => clearTimeout(handler);
  }, [categorySearchQuery]);

  const validateProductForm = () => {
    // **CORRECTED**: Validates camelCase fields
    if (!productForm.name.trim()) {
      toast.error('Product name is required');
      return false;
    }
    if (!productForm.price || Number.parseFloat(productForm.price) <= 0) {
      toast.error('Valid price is required');
      return false;
    }
    if (productForm.stock === '' || Number.parseInt(productForm.stock) < 0) {
      toast.error('Valid stock quantity is required');
      return false;
    }
    return true;
  };

  const validateCategoryForm = () => {
    // **CORRECTED**: Validates 'name' field
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required');
      return false;
    }
    return true;
  };

  // --- UI HANDLERS ---
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchProducts(page, searchQuery, selectedCategoryFilter);
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    // **CORRECTED**: Populates camelCase form state
    setProductForm({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      categoryId: product.categoryId?.toString() || '',
    });
    setIsEditProductOpen(true);
  };

  const openEditCategoryDialog = (category: Category) => {
    setSelectedCategory(category);
    // **CORRECTED**: Populates 'name' field
    setCategoryForm({ name: category.name });
    setIsEditCategoryOpen(true);
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedCategories(checked ? categories.map((cat) => cat.id) : []);
  };

  const handleCategorySelect = (categoryId: number, checked: boolean) => {
    setSelectedCategories((prev) =>
      checked ? [...prev, categoryId] : prev.filter((id) => id !== categoryId)
    );
  };

  // **CORRECTED**: Resets camelCase form state
  const resetProductForm = () =>
    setProductForm({ name: '', price: '', stock: '', categoryId: '' });
  const resetCategoryForm = () => setCategoryForm({ name: '' });

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
            <h1 className="text-lg font-semibold">Product Management</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative w-full md:w-64 lg:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                className="w-full rounded-lg bg-background pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className="h-9"
                onClick={() => setIsAddProductOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9 bg-transparent"
                onClick={() => setIsAddCategoryOpen(true)}
              >
                <Tag className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={selectedCategoryFilter}
                onValueChange={(val) => setSelectedCategoryFilter(val)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem
                      key={category.id}
                      value={category.id.toString()}
                    >
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) =>
                  value && setViewMode(value as 'grid' | 'list')
                }
              >
                <ToggleGroupItem value="grid">
                  <Grid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Categories</CardTitle>
                  <CardDescription>
                    Manage product categories ({categories.length} total)
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="search"
                    placeholder="Search categories..."
                    className="w-64"
                    value={categorySearchQuery}
                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                  />
                  {!isSelectMode ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSelectMode(true)}
                      disabled={categories.length === 0}
                    >
                      Select
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setIsSelectMode(false);
                          setSelectedCategories([]);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setIsBulkDeleteDialogOpen(true)}
                        disabled={selectedCategories.length === 0}
                      >
                        Delete ({selectedCategories.length})
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isSelectMode && categories.length > 0 && (
                <div className="mb-4 flex items-center gap-2">
                  <Checkbox
                    checked={
                      selectedCategories.length === categories.length &&
                      categories.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                  <Label>Select All</Label>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center gap-2 rounded-lg border p-2"
                  >
                    {isSelectMode && (
                      <Checkbox
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={(checked) =>
                          handleCategorySelect(category.id, !!checked)
                        }
                      />
                    )}
                    <Badge variant="outline">
                      {category.name}{' '}
                      {category.productCount !== undefined &&
                        `(${category.productCount})`}
                    </Badge>
                    {!isSelectMode && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => openEditCategoryDialog(category)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setCategoryToDelete(category);
                            setIsDeleteCategoryDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="text-muted-foreground">No categories found.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
              <CardDescription>
                Showing {products.length} of {pagination.totalItems} products
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-4">No products found.</p>
                </div>
              ) : viewMode === 'list' ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {product.category?.name || 'Uncategorized'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          Rp {product.price.toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              product.stock > 10 ? 'secondary' : 'destructive'
                            }
                          >
                            {product.stock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setProductToDelete(product);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {products.map((product) => (
                    <Card key={product.id}>
                      <CardHeader>
                        <CardTitle>{product.name}</CardTitle>
                        <Badge variant="outline">
                          {product.category?.name || 'Uncategorized'}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <p className="font-semibold">
                          Rp {product.price.toLocaleString('id-ID')}
                        </p>
                      </CardContent>
                      <CardFooter className="flex justify-between">
                        <Badge
                          variant={
                            product.stock > 10 ? 'secondary' : 'destructive'
                          }
                        >
                          Stock: {product.stock}
                        </Badge>
                        <div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setProductToDelete(product);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
              {pagination.totalPages > 1 && (
                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    disabled={currentPage === pagination.totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        {/* --- DIALOGS (Corrected form bindings) --- */}
        <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Input
                placeholder="Name"
                value={productForm.name}
                onChange={(e) =>
                  setProductForm({ ...productForm, name: e.target.value })
                }
              />
              <Input
                type="number"
                placeholder="Price"
                value={productForm.price}
                onChange={(e) =>
                  setProductForm({ ...productForm, price: e.target.value })
                }
              />
              <Input
                type="number"
                placeholder="Stock"
                value={productForm.stock}
                onChange={(e) =>
                  setProductForm({ ...productForm, stock: e.target.value })
                }
              />
              <Select
                // 1. Jika categoryId kosong, gunakan 'uncategorized' sebagai nilai Select
                value={productForm.categoryId || 'uncategorized'}
                onValueChange={(value) =>
                  // 2. Jika user memilih 'uncategorized', set state kembali ke string kosong
                  setProductForm({
                    ...productForm,
                    categoryId: value === 'uncategorized' ? '' : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {/* 3. Gunakan 'uncategorized' sebagai value yang valid */}
                  <SelectItem value="uncategorized">No Category</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddProductOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={createProduct} disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Input
                placeholder="Name"
                value={productForm.name}
                onChange={(e) =>
                  setProductForm({ ...productForm, name: e.target.value })
                }
              />
              <Input
                type="number"
                placeholder="Price"
                value={productForm.price}
                onChange={(e) =>
                  setProductForm({ ...productForm, price: e.target.value })
                }
              />
              <Input
                type="number"
                placeholder="Stock"
                value={productForm.stock}
                onChange={(e) =>
                  setProductForm({ ...productForm, stock: e.target.value })
                }
              />
              <Select
                value={productForm.categoryId || 'uncategorized'}
                onValueChange={(value) =>
                  setProductForm({
                    ...productForm,
                    categoryId: value === 'uncategorized' ? '' : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">No Category</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditProductOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={updateProduct} disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Category Name"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ name: e.target.value })}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddCategoryOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={createCategory} disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
            </DialogHeader>
            <Input
              placeholder="Category Name"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ name: e.target.value })}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditCategoryOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={updateCategory} disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* --- Alert Dialogs (Unchanged) --- */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the product "
                {productToDelete?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteProduct}
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={isDeleteCategoryDialogOpen}
          onOpenChange={setIsDeleteCategoryDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Category</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the category "
                {categoryToDelete?.name}"? Products in this category will become
                uncategorized.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteCategory}
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={isBulkDeleteDialogOpen}
          onOpenChange={setIsBulkDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Bulk Delete Categories</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete {selectedCategories.length}{' '}
                selected categories? Products will become uncategorized.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={bulkDeleteCategories}
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
