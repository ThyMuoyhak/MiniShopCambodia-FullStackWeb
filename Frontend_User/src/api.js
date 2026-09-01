import axios from 'axios';

export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Shop owner dashboard (Frontend_Dashboard_User) — opened from the storefront
// header when the owner is logged in and viewing their own shop.
export const DASHBOARD_URL =
  process.env.REACT_APP_DASHBOARD_URL || 'http://localhost:3002/';

const api = axios.create({ baseURL: API_BASE });

// Normalize errors so UI code never receives an array/object as an error message.
// FastAPI returns 422 validation errors as `detail: [{type, loc, msg, input}, ...]`,
// which would otherwise crash React ("Objects are not valid as a React child").
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const data = err?.response?.data;
    if (data && data.detail !== undefined && typeof data.detail !== 'string') {
      if (Array.isArray(data.detail)) {
        data.detail = data.detail
          .map((d) => (d && typeof d === 'object' && d.msg) || JSON.stringify(d))
          .join('; ');
      } else if (data.detail && typeof data.detail === 'object') {
        data.detail = data.detail.msg || JSON.stringify(data.detail);
      } else {
        data.detail = String(data.detail);
      }
    }
    return Promise.reject(err);
  }
);

export const fullUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE}${path}`;
};

// Public endpoints
export const getShop = (username) => api.get(`/api/shops/${username}`).then((r) => r.data);
export const getProducts = (shopId, params = {}) =>
  api.get('/api/products/public', { params: { shop_id: shopId, ...params } }).then((r) => r.data);
export const getProduct = (id) => api.get(`/api/products/${id}/public`).then((r) => r.data);
export const getCategories = (shopId) =>
  api.get('/api/categories/public', { params: { shop_id: shopId } }).then((r) => r.data);
export const createOrder = (payload) => api.post('/api/orders', payload).then((r) => r.data);
export const createPayment = (payload) => api.post('/api/payments/aba/create', payload).then((r) => r.data);
export const trackOrder = (orderNumber) =>
  api.get('/api/orders/public/track', { params: { order_number: orderNumber } }).then((r) => r.data);

// Plans / self-serve shop creation
export const getPlans = () => api.get('/api/plans').then((r) => r.data);
export const registerShop = (payload) => api.post('/api/plans/register', payload).then((r) => r.data);
export const confirmPlan = (payload) => api.post('/api/plans/confirm', payload).then((r) => r.data);
export const ownerLogin = (payload) => api.post('/api/auth/login', payload).then((r) => r.data);
export const ownerCheck = (shopId, token) =>
  api.get(`/api/shops/${shopId}/owner`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data);
export const verifyPayment = (payload) => api.post('/api/payments/aba/verify', payload).then((r) => r.data);
export const customerHistory = (payload) => api.post('/api/orders/public/history', payload).then((r) => r.data);
export const customerSignup = (payload) => api.post('/api/customers/auth/signup', payload).then((r) => r.data);
export const customerSignin = (payload) => api.post('/api/customers/auth/signin', payload).then((r) => r.data);
export const getMyOrders = (token) =>
  api.get('/api/customers/auth/orders', { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((r) => r.data);
export const createOrderAsCustomer = (payload, token) =>
  api.post('/api/orders', payload, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((r) => r.data);

// Customer profile management
export const updateMyProfile = (token, data) =>
  api.put('/api/customers/auth/me', data, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((r) => r.data);
export const changeMyPassword = (token, data) =>
  api.post('/api/customers/auth/change-password', data, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((r) => r.data);

export default api;
