import { useState, useEffect, useCallback } from 'react';
import { ProductItemRow } from '../types';
import { sounds } from '../../../lib/sounds';

export function useProducts() {
  const [products, setProducts] = useState<ProductItemRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (query: string = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const electron = (window as any).electron;
      if (electron?.searchProducts) {
        const res = await electron.searchProducts(query);
        if (res?.success && Array.isArray(res.data)) {
          const mapped: ProductItemRow[] = res.data.map((p: any) => ({
            id: p.id,
            name: p.name_ar,
            category: p.category_name || 'عام',
            brand: p.brand_name || 'بدون علامة',
            variantsCount: p.variants?.length || 1,
            totalStock: p.variants?.reduce((sum: number, v: any) => sum + (v.total_stock || 0), 0) || 0,
            unit: p.unit || 'قطعة',
            primaryBarcode: p.variants?.[0]?.barcodes?.[0] || '---',
            price: p.variants?.[0]?.sale_price || 0,
            variantId: p.variants?.[0]?.id,
            isActive: p.is_active ?? 1,
          }));
          setProducts(mapped);
          return;
        }
      }

      setProducts([]);
    } catch (err: any) {
      setError(err.message || 'تعذر تحميل المنتجات');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(searchQuery);
  }, [fetchProducts, searchQuery]);

  return {
    products,
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    refresh: () => fetchProducts(searchQuery),
  };
}

export default useProducts;
