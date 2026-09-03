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
  Upload,
  Image as ImageIcon,
  Utensils,
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
  image?: string;
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
    image: '',
  });
  const [categoryForm, setCategoryForm] = useState({ name: '' });

  // Recipe Modal States
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [recipeProduct, setRecipeProduct] = useState<Product | null>(null);
  const [allIngredients, setAllIngredients] = useState<
    { id: number; name: string; unit: string; stock: number; costPerUnit: number }[]
  >([]);
  const [recipeRows, setRecipeRows] = useState<
    { ingredientId: string; quantity: string }[]
  >([{ ingredientId: '', quantity: '' }]);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);

  const openRecipeModal = async (product: Product) => {
    setRecipeProduct(product);
    setIsRecipeModalOpen(true);
    try {
      const headers = getAuthHeaders(false);
      const ingRes = await fetch(`${API_BASE_URL}/ingredients`, { headers });
      const ingData = await ingRes.json();
      if (ingRes.ok && ingData.success) {
        setAllIngredients(ingData.data || []);
      }

      const recRes = await fetch(`${API_BASE_URL}/products/${product.id}/recipe`, { headers });
      const recData = await recRes.json();
      if (recRes.ok && recData.success && Array.isArray(recData.data.ingredients)) {
        if (recData.data.ingredients.length > 0) {
          setRecipeRows(
            recData.data.ingredients.map((item: any) => ({
              ingredientId: item.ingredientId.toString(),
              quantity: item.quantity.toString(),
            }))
          );
        } else {
          setRecipeRows([{ ingredientId: '', quantity: '' }]);
        }
      } else {
        setRecipeRows([{ ingredientId: '', quantity: '' }]);
      }
    } catch (err) {
      console.error('Error loading recipe:', err);
      toast.error('Gagal memuat resep produk');
      setRecipeRows([{ ingredientId: '', quantity: '' }]);
    }
  };

  const handleSaveRecipe = async () => {
    if (!recipeProduct) return;
    setIsSavingRecipe(true);
    try {
      const payload = {
        items: recipeRows
          .filter((r) => r.ingredientId && parseFloat(r.quantity) > 0)
          .map((r) => ({
            ingredientId: parseInt(r.ingredientId),
            quantity: parseFloat(r.quantity),
          })),
      };

      const res = await fetch(`${API_BASE_URL}/products/${recipeProduct.id}/recipe`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw data;
      toast.success('Resep sajian berhasil disimpan');
      setIsRecipeModalOpen(false);
    } catch (err: any) {
      handleApiError(err, 'Gagal menyimpan resep sajian');
    } finally {
      setIsSavingRecipe(false);
    }
  };

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
        image: productForm.image || null,
      };
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw data;

      // Simpan resep bahan baku jika diisi pada form Add Product
      const createdProdId = data.data?.id;
      if (
        createdProdId &&
        recipeRows.some((r) => r.ingredientId && parseFloat(r.quantity) > 0)
      ) {
        const recipePayload = {
          items: recipeRows
            .filter((r) => r.ingredientId && parseFloat(r.quantity) > 0)
            .map((r) => ({
              ingredientId: parseInt(r.ingredientId),
              quantity: parseFloat(r.quantity),
            })),
        };
        await fetch(`${API_BASE_URL}/products/${createdProdId}/recipe`, {
          method: 'POST',
          headers: getAuthHeaders(true),
          body: JSON.stringify(recipePayload),
        });
      }

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
        image: productForm.image || null,
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

      // Simpan/update resep bahan baku
      if (selectedProduct.id) {
        const recipePayload = {
          items: recipeRows
            .filter((r) => r.ingredientId && parseFloat(r.quantity) > 0)
            .map((r) => ({
              ingredientId: parseInt(r.ingredientId),
              quantity: parseFloat(r.quantity),
            })),
        };
        await fetch(`${API_BASE_URL}/products/${selectedProduct.id}/recipe`, {
          method: 'POST',
          headers: getAuthHeaders(true),
          body: JSON.stringify(recipePayload),
        });
      }

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

  const openAddProductDialog = async () => {
    resetProductForm();
    setRecipeRows([{ ingredientId: '', quantity: '' }]);
    setIsAddProductOpen(true);
    try {
      if (allIngredients.length === 0) {
        const headers = getAuthHeaders(false);
        const ingRes = await fetch(`${API_BASE_URL}/ingredients`, { headers });
        const ingData = await ingRes.json();
        if (ingRes.ok && ingData.success) {
          setAllIngredients(ingData.data || []);
        }
      }
    } catch (err) {
      console.error('Error fetching ingredients for add product:', err);
    }
  };

  const openEditDialog = async (product: Product) => {
    setSelectedProduct(product);
    setProductForm({
      name: product.name,
      price: product.price.toString(),
      stock: product.stock.toString(),
      categoryId: product.categoryId?.toString() || '',
      image: product.image || '',
    });
    setIsEditProductOpen(true);

    try {
      const headers = getAuthHeaders(false);
      if (allIngredients.length === 0) {
        const ingRes = await fetch(`${API_BASE_URL}/ingredients`, { headers });
        const ingData = await ingRes.json();
        if (ingRes.ok && ingData.success) {
          setAllIngredients(ingData.data || []);
        }
      }

      const recRes = await fetch(`${API_BASE_URL}/products/${product.id}/recipe`, { headers });
      const recData = await recRes.json();
      if (recRes.ok && recData.success && Array.isArray(recData.data.ingredients)) {
        if (recData.data.ingredients.length > 0) {
          setRecipeRows(
            recData.data.ingredients.map((item: any) => ({
              ingredientId: item.ingredientId.toString(),
              quantity: item.quantity.toString(),
            }))
          );
        } else {
          setRecipeRows([{ ingredientId: '', quantity: '' }]);
        }
      } else {
        setRecipeRows([{ ingredientId: '', quantity: '' }]);
      }
    } catch (err) {
      console.error('Error loading recipe in edit dialog:', err);
      setRecipeRows([{ ingredientId: '', quantity: '' }]);
    }
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
    setProductForm({ name: '', price: '', stock: '', categoryId: '', image: '' });
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
                onClick={openAddProductDialog}
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
                        <TableCell className="font-medium flex items-center gap-3">
                          <div className="w-10 h-10 rounded border overflow-hidden bg-slate-50 flex items-center justify-center flex-shrink-0">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <span>{product.name}</span>
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
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 mr-1"
                            onClick={() => openRecipeModal(product)}
                            title="Atur Resep Sajian Bahan Baku"
                          >
                            <Utensils className="h-3.5 w-3.5 text-amber-700" />
                            <span className="text-xs font-semibold">Resep</span>
                          </Button>
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
                    <Card key={product.id} className="overflow-hidden flex flex-col h-full">
                      <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-900 border-b overflow-hidden flex items-center justify-center">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                        )}
                      </div>
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-lg line-clamp-1">{product.name}</CardTitle>
                        <Badge variant="outline" className="w-fit">
                          {product.category?.name || 'Uncategorized'}
                        </Badge>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 flex-1">
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          Rp {product.price.toLocaleString('id-ID')}
                        </p>
                      </CardContent>
                      <CardFooter className="p-4 pt-0 flex items-center justify-between gap-2">
                        <Badge
                          variant={
                            product.stock > 10 ? 'secondary' : 'destructive'
                          }
                        >
                          Stock: {product.stock}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 gap-1 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                            onClick={() => openRecipeModal(product)}
                            title="Atur Resep Sajian Bahan Baku"
                          >
                            <Utensils className="h-3.5 w-3.5 text-amber-700" />
                            <span className="text-xs font-semibold">Resep</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(product)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
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
              <div className="space-y-2">
                <Label>Product Photo</Label>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-md border border-dashed flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 flex-shrink-0">
                    {productForm.image ? (
                      <img
                        src={productForm.image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      id="addProductImageInput"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setProductForm({
                              ...productForm,
                              image: event.target?.result as string,
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('addProductImageInput')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Image
                      </Button>
                      {productForm.image && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setProductForm({ ...productForm, image: '' })}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      PNG, JPG or WEBP. Square ratio recommended.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION RESEP BAHAN BAKU (Sajian) */}
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 mt-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 font-bold text-amber-900 text-xs uppercase">
                    <Utensils className="h-4 w-4 text-amber-600" />
                    <span>Racikan Resep Bahan Baku (Per 1 Porsi)</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-amber-800 hover:bg-amber-100"
                    onClick={() => setRecipeRows([...recipeRows, { ingredientId: '', quantity: '' }])}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    + Tambah Bahan
                  </Button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {recipeRows.map((row, idx) => {
                    const selectedIng = allIngredients.find((i) => i.id.toString() === row.ingredientId);
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={row.ingredientId}
                          onChange={(e) => {
                            const newRows = [...recipeRows];
                            newRows[idx].ingredientId = e.target.value;
                            setRecipeRows(newRows);
                          }}
                          className="flex-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs bg-white focus:border-amber-500 focus:outline-none"
                        >
                          <option value="">-- Pilih Bahan Baku --</option>
                          {allIngredients.map((ing) => (
                            <option key={ing.id} value={ing.id.toString()}>
                              {ing.name} ({ing.unit})
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1 w-28">
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Jumlah"
                            value={row.quantity}
                            onChange={(e) => {
                              const newRows = [...recipeRows];
                              newRows[idx].quantity = e.target.value;
                              setRecipeRows(newRows);
                            }}
                            className="h-8 text-xs px-2"
                          />
                          <span className="text-[11px] text-gray-600 truncate w-8">
                            {selectedIng ? selectedIng.unit : ''}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-100"
                          onClick={() => {
                            const newRows = recipeRows.filter((_, i) => i !== idx);
                            setRecipeRows(newRows.length > 0 ? newRows : [{ ingredientId: '', quantity: '' }]);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
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
              <div className="space-y-2">
                <Label>Product Photo</Label>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 rounded-md border border-dashed flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 flex-shrink-0">
                    {productForm.image ? (
                      <img
                        src={productForm.image}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      id="editProductImageInput"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setProductForm({
                              ...productForm,
                              image: event.target?.result as string,
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('editProductImageInput')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choose Image
                      </Button>
                      {productForm.image && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setProductForm({ ...productForm, image: '' })}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      PNG, JPG or WEBP. Square ratio recommended.
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION RESEP BAHAN BAKU (Sajian) */}
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 mt-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-1.5 font-bold text-amber-900 text-xs uppercase">
                    <Utensils className="h-4 w-4 text-amber-600" />
                    <span>Racikan Resep Bahan Baku (Per 1 Porsi)</span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-amber-800 hover:bg-amber-100"
                    onClick={() => setRecipeRows([...recipeRows, { ingredientId: '', quantity: '' }])}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    + Tambah Bahan
                  </Button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {recipeRows.map((row, idx) => {
                    const selectedIng = allIngredients.find((i) => i.id.toString() === row.ingredientId);
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <select
                          value={row.ingredientId}
                          onChange={(e) => {
                            const newRows = [...recipeRows];
                            newRows[idx].ingredientId = e.target.value;
                            setRecipeRows(newRows);
                          }}
                          className="flex-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs bg-white focus:border-amber-500 focus:outline-none"
                        >
                          <option value="">-- Pilih Bahan Baku --</option>
                          {allIngredients.map((ing) => (
                            <option key={ing.id} value={ing.id.toString()}>
                              {ing.name} ({ing.unit})
                            </option>
                          ))}
                        </select>
                        <div className="flex items-center gap-1 w-28">
                          <Input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="Jumlah"
                            value={row.quantity}
                            onChange={(e) => {
                              const newRows = [...recipeRows];
                              newRows[idx].quantity = e.target.value;
                              setRecipeRows(newRows);
                            }}
                            className="h-8 text-xs px-2"
                          />
                          <span className="text-[11px] text-gray-600 truncate w-8">
                            {selectedIng ? selectedIng.unit : ''}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-100"
                          onClick={() => {
                            const newRows = recipeRows.filter((_, i) => i !== idx);
                            setRecipeRows(newRows.length > 0 ? newRows : [{ ingredientId: '', quantity: '' }]);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
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

        {/* --- DIALOG ATUR RESEP SAJIAN --- */}
        <Dialog open={isRecipeModalOpen} onOpenChange={setIsRecipeModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Utensils className="h-5 w-5 text-amber-600" />
                <span>Atur Resep Sajian: {recipeProduct?.name}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-amber-50/80 border border-amber-200 p-3 text-xs text-amber-900">
                Tentukan takaran bahan baku per 1 porsi/sajian. Saat transaksi dibuat, stok bahan baku akan terpotong secara otomatis.
              </div>

              {/* Dynamic Recipe Rows */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 uppercase px-1">
                  <div className="col-span-6">Bahan Baku (Gudang)</div>
                  <div className="col-span-4">Takaran per Porsi</div>
                  <div className="col-span-2 text-right">Aksi</div>
                </div>

                {recipeRows.map((row, idx) => {
                  const selectedIng = allIngredients.find((i) => i.id.toString() === row.ingredientId);
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <select
                          value={row.ingredientId}
                          onChange={(e) => {
                            const newRows = [...recipeRows];
                            newRows[idx].ingredientId = e.target.value;
                            setRecipeRows(newRows);
                          }}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                        >
                          <option value="">-- Pilih Bahan Baku --</option>
                          {allIngredients.map((ing) => (
                            <option key={ing.id} value={ing.id.toString()}>
                              {ing.name} (Stok: {ing.stock} {ing.unit})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-4 flex items-center gap-1">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="Jumlah"
                          value={row.quantity}
                          onChange={(e) => {
                            const newRows = [...recipeRows];
                            newRows[idx].quantity = e.target.value;
                            setRecipeRows(newRows);
                          }}
                          className="w-full"
                        />
                        <span className="text-xs font-medium text-gray-600 w-12 truncate">
                          {selectedIng ? selectedIng.unit : ''}
                        </span>
                      </div>
                      <div className="col-span-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            const newRows = recipeRows.filter((_, i) => i !== idx);
                            setRecipeRows(newRows.length > 0 ? newRows : [{ ingredientId: '', quantity: '' }]);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-dashed border-gray-300 text-gray-700 hover:bg-gray-50"
                onClick={() => setRecipeRows([...recipeRows, { ingredientId: '', quantity: '' }])}
              >
                <Plus className="h-4 w-4 mr-1" />
                Tambah Bahan Lainnya
              </Button>

              {/* HPP & Portion Calculations */}
              {(() => {
                let calculatedHpp = 0;
                let minPortionCapacity = Infinity;

                recipeRows.forEach((row) => {
                  const ing = allIngredients.find((i) => i.id.toString() === row.ingredientId);
                  const qty = parseFloat(row.quantity) || 0;
                  if (ing && qty > 0) {
                    calculatedHpp += ing.costPerUnit * qty;
                    const possiblePortions = Math.floor(ing.stock / qty);
                    if (possiblePortions < minPortionCapacity) {
                      minPortionCapacity = possiblePortions;
                    }
                  }
                });
                if (minPortionCapacity === Infinity) minPortionCapacity = 0;

                const hargaJual = recipeProduct ? recipeProduct.price : 0;
                const estimasiProfit = hargaJual - calculatedHpp;
                const profitMargin = hargaJual > 0 ? ((estimasiProfit / hargaJual) * 100).toFixed(1) : '0';

                return (
                  <div className="rounded-lg bg-gray-50 p-4 border space-y-2 text-xs">
                    <div className="flex justify-between items-center text-gray-700">
                      <span>Total HPP Bahan / Porsi:</span>
                      <strong className="text-sm font-bold text-gray-900">
                        Rp {calculatedHpp.toLocaleString('id-ID')}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-gray-700">
                      <span>Harga Jual Produk:</span>
                      <strong className="text-sm font-bold text-emerald-700">
                        Rp {hargaJual.toLocaleString('id-ID')}
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-gray-700 border-t pt-2">
                      <span>Estimasi Margin Profit:</span>
                      <strong className="text-emerald-700">
                        Rp {estimasiProfit.toLocaleString('id-ID')} ({profitMargin}%)
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-gray-700">
                      <span>Kapasitas Sisa Porsi di Gudang:</span>
                      <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        📦 ~{minPortionCapacity} Porsi Tersedia
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsRecipeModalOpen(false)}
              >
                Batal
              </Button>
              <Button onClick={handleSaveRecipe} disabled={isSavingRecipe} className="bg-amber-600 hover:bg-amber-700 text-white">
                {isSavingRecipe && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Resep
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </SidebarProvider>
  );
}
