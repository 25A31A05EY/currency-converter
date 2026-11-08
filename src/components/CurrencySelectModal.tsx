import React, { useState, useMemo } from 'react';
import { Search, X, Check } from 'lucide-react';
import { CURRENCY_LIST } from '../data/currencies';
import { Currency } from '../types';

interface CurrencySelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (code: string) => void;
  selectedCode: string;
  title: string;
}

export const CurrencySelectModal: React.FC<CurrencySelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedCode,
  title,
}) => {
  const [search, setSearch] = useState('');

  const filteredCurrencies = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return CURRENCY_LIST;
    return CURRENCY_LIST.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by code, country, or symbol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 text-slate-900 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Currency List */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100 p-2">
          {filteredCurrencies.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No currencies match &quot;{search}&quot;
            </div>
          ) : (
            filteredCurrencies.map((currency: Currency) => {
              const isSelected = currency.code === selectedCode;
              return (
                <button
                  key={currency.code}
                  onClick={() => {
                    onSelect(currency.code);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-slate-100 text-slate-900 font-medium'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl leading-none">{currency.flag}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900 text-sm">
                          {currency.code}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({currency.symbol})
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 truncate max-w-[220px]">
                        {currency.name}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-slate-900 shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
