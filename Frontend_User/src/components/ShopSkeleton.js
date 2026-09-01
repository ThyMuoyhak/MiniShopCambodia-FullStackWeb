import React from 'react';
import { useLanguage } from '../i18n';

/**
 * White full-screen "loading shop" layout with pulsing skeleton placeholders
 * that mirror the real site (header, hero banner, product cards) plus a
 * running spinner — like a real website loading screen.
 */
export default function ShopSkeleton() {
  const { t } = useLanguage();
  const pulse = 'bg-gray-100 animate-pulse';

  return (
    <div className="min-h-screen bg-white">
      {/* Header skeleton */}
      <header className="h-16 border-b border-gray-100 flex items-center justify-between px-4 max-w-7xl mx-auto w-full">
        <div className={`w-10 h-10 rounded-full ${pulse}`} />
        <div className="hidden md:flex items-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`w-16 h-4 rounded ${pulse}`} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-24 h-8 rounded-full ${pulse}`} />
          <div className={`w-8 h-8 rounded-lg ${pulse}`} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Hero banner skeleton */}
        <div className={`h-56 md:h-80 rounded-2xl ${pulse}`} />

        {/* Product card skeletons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="space-y-2">
              <div className={`aspect-square rounded-xl ${pulse}`} />
              <div className={`h-4 w-3/4 rounded ${pulse}`} />
              <div className={`h-4 w-1/2 rounded ${pulse}`} />
            </div>
          ))}
        </div>

        {/* Running loader */}
        <div className="flex flex-col items-center justify-center py-10">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
          </div>
          <p className="text-gray-500 mt-4 text-sm">{t('loadingShop')}</p>
        </div>
      </main>
    </div>
  );
}
