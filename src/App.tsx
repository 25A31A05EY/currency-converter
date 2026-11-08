import { useState, useEffect, useCallback, useRef } from 'react';
import { ConverterCard } from './components/ConverterCard';
import { calculateLocalConversion, CURRENCIES } from './data/currencies';
import { ConversionResult } from './types';

export default function App() {
  const [amount, setAmount] = useState<number>(100);
  const [fromCurrency, setFromCurrency] = useState<string>('USD');
  const [toCurrency, setToCurrency] = useState<string>('EUR');
  const [conversion, setConversion] = useState<ConversionResult | null>(() => {
    const local = calculateLocalConversion(100, 'USD', 'EUR');
    return {
      amount: 100,
      from: 'USD',
      to: 'EUR',
      rate: local.rate,
      inverse_rate: local.inverse,
      result: local.result,
      source: 'initial_cache',
      timestamp: new Date().toISOString(),
      from_details: CURRENCIES['USD'],
      to_details: CURRENCIES['EUR'],
    };
  });
  const [loading, setLoading] = useState<boolean>(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync conversion with Python backend
  const fetchPythonConversion = useCallback(
    async (amt: number, from: string, to: string) => {
      setLoading(true);
      try {
        const res = await fetch('/api/convert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: amt, from, to }),
        });

        if (res.ok) {
          const data: ConversionResult = await res.json();
          setConversion(data);
        }
      } catch (err) {
        console.warn('Backend Python fetch error, using local fallback:', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Instant local preview + debounced Python server conversion
  useEffect(() => {
    const local = calculateLocalConversion(amount, fromCurrency, toCurrency);
    setConversion((prev) => ({
      amount,
      from: fromCurrency,
      to: toCurrency,
      rate: prev?.rate || local.rate,
      inverse_rate: prev?.inverse_rate || local.inverse,
      result: amount * (prev?.rate || local.rate),
      source: prev?.source || 'instant_cache',
      timestamp: prev?.timestamp || new Date().toISOString(),
      from_details: CURRENCIES[fromCurrency] || {
        code: fromCurrency,
        name: fromCurrency,
        symbol: '$',
        flag: '',
      },
      to_details: CURRENCIES[toCurrency] || {
        code: toCurrency,
        name: toCurrency,
        symbol: '€',
        flag: '',
      },
      execution: prev?.execution,
    }));

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchPythonConversion(amount, fromCurrency, toCurrency);
    }, 200);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [amount, fromCurrency, toCurrency, fetchPythonConversion]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900 selection:bg-slate-200">
      {/* Simple Header */}
      <header className="bg-white border-b border-slate-200 py-4">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-xs">
              $
            </div>
            <span className="text-base font-bold text-slate-900 tracking-tight">
              Currency Converter
            </span>
          </div>
        </div>
      </header>

      {/* Main plain converter container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-16 flex flex-col justify-center">
        <div className="mb-6 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Currency Converter
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Fast, live exchange rate conversions.
          </p>
        </div>

        {/* Plain Converter Card */}
        <ConverterCard
          amount={amount}
          setAmount={setAmount}
          fromCurrency={fromCurrency}
          setFromCurrency={setFromCurrency}
          toCurrency={toCurrency}
          setToCurrency={setToCurrency}
          conversion={conversion}
          loading={loading}
          onRefresh={() => fetchPythonConversion(amount, fromCurrency, toCurrency)}
        />
      </main>

      {/* Minimal Footer */}
      <footer className="py-4 border-t border-slate-200 bg-white text-center text-xs text-slate-400">
        Currency Converter
      </footer>
    </div>
  );
}
