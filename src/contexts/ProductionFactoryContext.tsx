import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchProductionFactories, type ProductionFactory } from '../api/productionApi';

interface ProductionFactoryContextValue {
  factories: ProductionFactory[];
  selectedFactoryId: string | null;
  setSelectedFactoryId: (id: string | null) => void;
  loading: boolean;
  error: string | null;
  refreshFactories: () => Promise<void>;
}

const ProductionFactoryContext = createContext<ProductionFactoryContextValue | null>(null);

export function ProductionFactoryProvider({ children }: { children: React.ReactNode }) {
  const [factories, setFactories] = useState<ProductionFactory[]>([]);
  const [selectedFactoryId, setSelectedFactoryIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshFactories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchProductionFactories();
      setFactories(list);
      setSelectedFactoryIdState((prev) => {
        if (list.length === 0) return null;
        if (!prev || !list.some((f) => f.id === prev)) return list[0].id;
        return prev;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load factories');
      setFactories([]);
      setSelectedFactoryIdState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const setSelectedFactoryId = useCallback((id: string | null) => {
    setSelectedFactoryIdState(id);
  }, []);

  useEffect(() => {
    refreshFactories();
  }, []);

  const value: ProductionFactoryContextValue = {
    factories,
    selectedFactoryId,
    setSelectedFactoryId,
    loading,
    error,
    refreshFactories,
  };

  return (
    <ProductionFactoryContext.Provider value={value}>
      {children}
    </ProductionFactoryContext.Provider>
  );
}

export function useProductionFactory() {
  const ctx = useContext(ProductionFactoryContext);
  if (!ctx) {
    throw new Error('useProductionFactory must be used within ProductionFactoryProvider');
  }
  return ctx;
}
