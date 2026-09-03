// API client for the Mini App - talks to the same FastAPI backend.
// On Netlify no REACT_APP_API_URL is set -> '' means same-origin: every
// /api/... call is served by netlify.toml's /api proxy to the Render backend
// For this public study copy, point REACT_APP_API_URL at YOUR OWN backend
// (e.g. http://localhost:8000). No hosted/live URLs are included.
const rawApi =
  typeof process.env.REACT_APP_API_URL === 'string'
    ? process.env.REACT_APP_API_URL.trim()
    : '';
const API = rawApi ? rawApi.replace(/\/+$/, '') : '';

// Images (banners, logos, products, QR) are stored on the real backend host.
const MEDIA = (
  process.env.REACT_APP_MEDIA_URL ||
  'http://localhost:8000'  // local study default - set REACT_APP_MEDIA_URL to your own host
).replace(/\/+$/, '');

let _token = '';

export function setToken(t) {
  _token = t || '';
}
export function getToken() {
  return _token;
}

function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${MEDIA}${path.startsWith('/') ? path : '/' + path}`;
}

async function req(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (_token) headers.Authorization = `Bearer ${_token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  if (!res.ok) {
    const detail =
      (data && (data.detail || data.message)) ||
      `Request failed (${res.status})`;
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
      : String(detail);
    throw new Error(message);
  }
  return data;
}

export const api = {
  mediaUrl,

  shop: (username) => req(`/api/shops/${username}/mini`),

  categories: (shopId) => req(`/api/categories/public?shop_id=${shopId}`),

  products: (shopId, categoryId) => {
    const cat = categoryId ? `&category_id=${categoryId}` : '';
    return req(`/api/products/public?shop_id=${shopId}${cat}`);
  },

  // Full product detail (all images, description, variations, attributes).
  productDetail: (id) => req(`/api/products/${id}/public`),

  // Telegram Mini App auto-login (server verifies initData against the bot).
  miniLogin: (shopId, initData) =>
    req('/api/auth/telegram/mini/login', {
      method: 'POST',
      body: { shop_id: shopId, init_data: initData },
    }),

  createOrder: (payload) =>
    req('/api/orders', { method: 'POST', body: payload }),

  abaCreate: (orderId) =>
    req('/api/payments/aba/create', {
      method: 'POST',
      body: {
        order_id: orderId,
        success_url: `${window.location.origin}${window.location.pathname}?paid=1`,
        error_url: `${window.location.origin}${window.location.pathname}?paid=0`,
        cancel_url: `${window.location.origin}${window.location.pathname}`,
      },
    }),

  abaVerify: (orderId, transactionId) =>
    req('/api/payments/aba/verify', {
      method: 'POST',
      body: { order_id: orderId, transaction_id: transactionId || '' },
    }),
};
