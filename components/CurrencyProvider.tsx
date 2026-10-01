'use client';

import React, { createContext, useContext, ReactNode } from 'react';

type Currency = 'USD' | 'VES';

interface CurrencyContextType {
  currency: Currency;
  toggleCurrency: () => void;
  rate: number;
  setRateContext: (rate: number) => void;
  formatCurrency: (montoUSD: number | string | null | undefined) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children, initialRate = 0 }: { children: ReactNode, initialRate?: number }) {
  // Hardcoded values since we are USD only now.
  const currency: Currency = 'USD';
  const rate: number = 1;

  const toggleCurrency = () => { /* No-op */ };
  const setRateContext = () => { /* No-op */ };

  const formatCurrency = (amount: number | string | null | undefined): string => {
    const numericValue = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
    if (isNaN(numericValue)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
  };

  return (
    <CurrencyContext.Provider value={{ currency, toggleCurrency, rate, setRateContext, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
