import React, { useEffect, useState } from 'react';
import { fullUrl } from '../api';

// Deterministic accent colors so every shop's fallback badge is visually distinct.
const SHOP_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#22c55e',
];

export const shopColor = (username = '') => {
  let hash = 0;
  for (let i = 0; i < username.length; i += 1) {
    hash = (hash * 31 + username.charCodeAt(i)) >>> 0;
  }
  return SHOP_COLORS[hash % SHOP_COLORS.length];
};

/**
 * Per-shop logo:
 *  - shows the shop's logo image when it exists,
 *  - otherwise (or if the image fails to load) a letter badge with a color
 *    derived from the shop username, so the logo always follows the shop.
 * State resets automatically whenever the shop changes.
 */
export default function ShopLogo({ shop, className = '', textClassName = 'text-lg' }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [shop && shop.id]);

  if (!shop) return null;

  const letter = ((shop.shop_name || shop.username || 'S')[0] || 'S').toUpperCase();

  if (shop.logo && !failed) {
    return (
      <img
        src={fullUrl(shop.logo)}
        alt={shop.shop_name || shop.username}
        className={`object-cover ${className}`}
        onError={() => setFailed(true)}
        loading="lazy"
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center text-white font-bold ${textClassName} ${className}`}
      style={{ backgroundColor: shopColor(shop.username) }}
    >
      {letter}
    </div>
  );
}
