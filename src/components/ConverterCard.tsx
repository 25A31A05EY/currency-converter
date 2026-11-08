import React, { useState } from 'react';
import { ArrowLeftRight, Check, Copy, RefreshCw } from 'lucide-react';
import { CURRENCIES } from '../data/currencies';
import { ConversionResult } from '../types';
import { CurrencySelectModal } from './CurrencySelectModal';

interface ConverterCardProps {
  amount: number;
  setAmount: (amt: number) => void;
  fromCurrency: string;
  setFromCurrency: (code: string) => void;
  toCurrency: string;
  setToCurrency: (code: string) => void;
  conversion: ConversionResult | null;
  loading: boolean;
  onRefresh: () => void;
}

export const ConverterCard: React.FC<ConverterCardProps> = ({
  amount,
  setAmount,
  fromCurrency,
  setFromCurrency,
  toCurrency,
  setToCurrency,
  conversion,
  loading,
  onRefresh,
}) => {
  const [modalTarget, setModalTarget] = useState<'from' | 'to' | null>(null);
  const [copied, setCopied] = useState(false);

  const fromCurr = CURRENCIES[fromCurrency] || {
    code: fromCurrency,
    name: fromCurrency,
    symbol: '$',
    flag: '🌐',
  };
  const toCurr = CURRENCIES[toCurrency] || {
    code: toCurrency,
    name: toCurrency,
    symbol: '€',
    flag: '🌐',
  };

  const handleSwap = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const handleCopy = () => {
    if (!conversion) return;
    const text = `${amount} ${fromCurrency} = ${conversion.result.toFixed(2)} ${toCurrency} (1 ${fromCurrency} = ${conversion.rate} ${toCurrency})`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const result = conversion ? conversion.result : 0;
  const rate = conversion ? conversion.rate : 0;
  const inverseRate = conversion ? conversion.inverse_rate : 0;

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
      {/* Input Row: Amount, From, Swap, To */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
        {/* Amount Input */}
        <div className="md:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-3.5 focus-within:bg-white focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-900/5 transition-all">
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Amount
          </label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-slate-400 select-none">
              {fromCurr.symbol}
            </span>
            <input
              type="number"
              min="0"
              step="any"
              value={amount === 0 ? '' : amount}
              placeholder="0.00"
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setAmount(isNaN(val) ? 0 : Math.max(0, val));
              }}
              className="w-full text-2xl font-bold text-slate-900 bg-transparent focus:outline-hidden font-mono tabular-nums"
            />
          </div>
        </div>

        {/* From Currency */}
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            From
          </label>
          <button
            type="button"
            onClick={() => setModalTarget('from')}
            className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 truncate">
              <span className="text-2xl leading-none">{fromCurr.flag}</span>
              <div className="truncate">
                <div className="text-sm font-bold text-slate-900">{fromCurr.code}</div>
                <div className="text-xs text-slate-500 truncate">{fromCurr.name}</div>
              </div>
            </div>
            <span className="text-xs text-slate-400 group-hover:text-slate-600 font-medium">Select</span>
          </button>
        </div>

        {/* Swap Button */}
        <div className="md:col-span-1 flex justify-center py-1">
          <button
            type="button"
            onClick={handleSwap}
            aria-label="Swap currencies"
            className="w-11 h-11 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </div>

        {/* To Currency */}
        <div className="md:col-span-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">
            To
          </label>
          <button
            type="button"
            onClick={() => setModalTarget('to')}
            className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 truncate">
              <span className="text-2xl leading-none">{toCurr.flag}</span>
              <div className="truncate">
                <div className="text-sm font-bold text-slate-900">{toCurr.code}</div>
                <div className="text-xs text-slate-500 truncate">{toCurr.name}</div>
              </div>
            </div>
            <span className="text-xs text-slate-400 group-hover:text-slate-600 font-medium">Select</span>
          </button>
        </div>
      </div>

      {/* Result Display Box */}
      <div className="mt-6 p-6 bg-slate-50 border border-slate-200 rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Converted Amount
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight flex items-baseline gap-2 font-mono tabular-nums">
              <span>{toCurr.symbol}{result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
              <span className="text-lg font-bold text-slate-500">{toCurr.code}</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {amount.toLocaleString()} {fromCurr.code} = {result.toFixed(2)} {toCurr.code}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Rate Info */}
        <div className="mt-5 pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            <span className="text-slate-400">Rate: </span>
            <span className="font-semibold text-slate-900 font-mono tabular-nums">
              1 {fromCurr.code} = {rate ? rate.toFixed(4) : '—'} {toCurr.code}
            </span>
          </div>
          <div>
            <span className="text-slate-400">Inverse: </span>
            <span className="font-semibold text-slate-900 font-mono tabular-nums">
              1 {toCurr.code} = {inverseRate ? inverseRate.toFixed(4) : '—'} {fromCurr.code}
            </span>
          </div>
        </div>
      </div>

      {/* Currency Selection Modal */}
      <CurrencySelectModal
        isOpen={modalTarget !== null}
        onClose={() => setModalTarget(null)}
        onSelect={(code) => {
          if (modalTarget === 'from') setFromCurrency(code);
          if (modalTarget === 'to') setToCurrency(code);
        }}
        selectedCode={modalTarget === 'from' ? fromCurrency : toCurrency}
        title={modalTarget === 'from' ? 'Select Base Currency' : 'Select Target Currency'}
      />
    </div>
  );
};
