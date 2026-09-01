import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import ProductCard from './ProductCard';

/**
 * Horizontally scrollable single row of product cards with prev/next arrow
 * buttons. The user scrolls left/right — NO auto-scroll. Hides the scrollbar.
 */
export default function ProductRow({ products }) {
  const trackRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const cardStep = useCallback(() => {
    const el = trackRef.current;
    if (!el) return 240;
    const card = el.querySelector('[data-card]');
    return card ? card.getBoundingClientRect().width + 16 : 240;
  }, []);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const scrollBy = useCallback((dir) => {
    trackRef.current?.scrollBy({ left: dir * cardStep(), behavior: 'smooth' });
  }, [cardStep]);

  // Keep arrows in sync with scroll position / window resize.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [updateArrows, products]);

  if (!products || products.length === 0) return null;

  return (
    <div className="relative">
      {/* Prev arrow */}
      {canPrev && (
        <button
          onClick={() => scrollBy(-1)}
          aria-label="Scroll left"
          className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 p-2 text-gray-600 dark:text-gray-300 hover:text-primary hover:border-primary transition"
        >
          <FiChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Next arrow */}
      {canNext && (
        <button
          onClick={() => scrollBy(1)}
          aria-label="Scroll right"
          className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 p-2 text-gray-600 dark:text-gray-300 hover:text-primary hover:border-primary transition"
        >
          <FiChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Track — single row, user scrolls left/right */}
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory no-scrollbar"
      >
        {products.map((p) => (
          <div key={p.id} data-card className="min-w-[220px] max-w-[220px] flex-shrink-0 snap-start">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
