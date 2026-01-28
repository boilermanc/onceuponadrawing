import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

interface BookPrice {
  priceId: string;
  amount: number;
  currency: string;
  displayPrice: string;
  productName: string;
}

interface BookPricesResponse {
  ebook: BookPrice | null;
  softcover: BookPrice | null;
  hardcover: BookPrice | null;
}

interface PricesContextType {
  prices: BookPricesResponse | null;
  loading: boolean;
  error: string | null;
  fetchPrices: () => Promise<void>;
}

const PricesContext = createContext<PricesContextType | undefined>(undefined);

export function PricesProvider({ children }: { children: React.ReactNode }) {
  const [prices, setPrices] = useState<BookPricesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    // Don't refetch if we already have prices
    if (prices) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('get-book-prices');

      if (fnError) throw fnError;
      setPrices(data);
    } catch (err) {
      console.error('Failed to fetch prices:', err);
      setError(err instanceof Error ? err.message : 'Failed to load prices');
    } finally {
      setLoading(false);
    }
  }, [prices]);

  return (
    <PricesContext.Provider value={{ prices, loading, error, fetchPrices }}>
      {children}
    </PricesContext.Provider>
  );
}

export function usePrices() {
  const context = useContext(PricesContext);
  if (context === undefined) {
    throw new Error('usePrices must be used within a PricesProvider');
  }
  return context;
}

// Re-export types for consumers
export type { BookPrice, BookPricesResponse };
