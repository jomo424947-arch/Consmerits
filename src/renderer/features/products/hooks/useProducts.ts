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
          }));
          setProducts(mapped);
          return;
        }
      }

      // بيانات افتراضية توضيحية أولية إن كانت قاعدة البيانات جديدة تماماً
      setProducts([
        { id: 1, name: 'أحمر شفاه مخملي ميني', category: 'مكياج', brand: 'ميبيلين', variantsCount: 4, totalStock: 35, unit: 'قطعة' },
        { id: 2, name: 'سيروم حمض الهيالورونيك 30مل', category: 'عناية بالبشرة', brand: 'ذا أورديناري', variantsCount: 1, totalStock: 18, unit: 'عبوة' },
        { id: 3, name: 'ماسكارا لاش برنسيس المقاومة للماء', category: 'عيون', brand: 'إيسنس', variantsCount: 2, totalStock: 42, unit: 'قطعة' },
        { id: 4, name: 'كريم مرطب غني للبشرة الجافة', category: 'عناية بالبشرة', brand: 'سيتافيل', variantsCount: 2, totalStock: 12, unit: 'علبة' },
        { id: 5, name: 'عطر زهري شرقي 50مل', category: 'عطور', brand: 'زارا', variantsCount: 1, totalStock: 8, unit: 'زجاجة' },
      ]);
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
