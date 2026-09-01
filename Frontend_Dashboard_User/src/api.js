import axios from 'axios';

export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('ms_token');
      localStorage.removeItem('ms_user');
      window.location.href = '/login';
    }
    // Normalize FastAPI 422 validation errors into a readable string
    // (prevents "Objects are not valid as a React child" crashes).
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

// Auth
export const login = (data) => api.post('/api/auth/login', data).then((r) => r.data);
export const changePassword = (data) => api.post('/api/auth/change-password', data).then((r) => r.data);

// Shop
export const getShopDetail = (shopId) => api.get(`/api/shops/${shopId}/detail`).then((r) => r.data);
export const updateShop = (shopId, data) => api.put(`/api/shops/${shopId}/update`, data).then((r) => r.data);

// Overview / reports
export const getOverview = (shopId) => api.get('/api/reports/overview', { params: { shop_id: shopId } }).then((r) => r.data);
export const getSalesReport = (shopId, period, days) =>
  api.get('/api/reports/sales', { params: { shop_id: shopId, period, days } }).then((r) => r.data);
export const getProductReport = (shopId) =>
  api.get('/api/reports/products', { params: { shop_id: shopId } }).then((r) => r.data);
export const getCustomerReport = (shopId) =>
  api.get('/api/reports/customers', { params: { shop_id: shopId } }).then((r) => r.data);

// Stock management
export const getStockReport = (shopId, low = 5, high = 50) =>
  api.get('/api/reports/stock', { params: { shop_id: shopId, low, high } }).then((r) => r.data);
export const updateStock = (id, quantity, mode = 'set') =>
  api.post(`/api/products/${id}/stock`, { quantity, mode }).then((r) => r.data);
export const sendStockAlert = (shopId) =>
  api.post('/api/telegram/stock-alert', null, { params: { shop_id: shopId } }).then((r) => r.data);

// Products
export const listProducts = (shopId) => api.get('/api/products', { params: { shop_id: shopId } }).then((r) => r.data);
export const getProduct = (id) => api.get(`/api/products/${id}`).then((r) => r.data);
export const createProduct = (data) => api.post('/api/products', data).then((r) => r.data);
export const updateProduct = (id, data) => api.put(`/api/products/${id}`, data).then((r) => r.data);
export const deleteProduct = (id) => api.delete(`/api/products/${id}`).then((r) => r.data);

// Categories
export const listCategories = (shopId) => api.get('/api/categories', { params: { shop_id: shopId } }).then((r) => r.data);
export const createCategory = (data) => api.post('/api/categories', data).then((r) => r.data);
export const updateCategory = (id, data) => api.put(`/api/categories/${id}`, data).then((r) => r.data);
export const deleteCategory = (id) => api.delete(`/api/categories/${id}`).then((r) => r.data);

// Orders
export const listOrders = (shopId, status) =>
  api.get('/api/orders', { params: { shop_id: shopId, status } }).then((r) => r.data);
export const getOrder = (id) => api.get(`/api/orders/${id}`).then((r) => r.data);
export const updateOrderStatus = (id, data) => api.put(`/api/orders/${id}/status`, data).then((r) => r.data);
export const generateReceipt = (id) => api.get(`/api/orders/${id}/receipt`).then((r) => r.data);

// Customers
export const listCustomers = (shopId, search) =>
  api.get('/api/customers', { params: { shop_id: shopId, search } }).then((r) => r.data);
export const getCustomer = (id) => api.get(`/api/customers/${id}`).then((r) => r.data);

// Uploads
export const uploadImage = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/api/uploads', fd).then((r) => r.data);
};
export const uploadImages = (files) => {
  const fd = new FormData();
  files.forEach((f) => fd.append('files', f));
  return api.post('/api/uploads/product', fd).then((r) => r.data);
};

// Payments / Telegram
export const testPayment = (shopId) => api.post('/api/payments/aba/test', null, { params: { shop_id: shopId } }).then((r) => r.data);
export const createPayment = (data) => api.post('/api/payments/aba/create', data).then((r) => r.data);
export const verifyPayment = (payload) => api.post('/api/payments/aba/verify', payload).then((r) => r.data);
export const getPlans = () => api.get('/api/plans').then((r) => r.data);
export const upgradePlan = (payload) => api.post('/api/plans/upgrade', payload).then((r) => r.data);
export const confirmPlan = (payload) => api.post('/api/plans/confirm', payload).then((r) => r.data);
export const testTelegram = (data) => api.post('/api/telegram/test', data).then((r) => r.data);
export const getTelegramSettings = (shopId) => api.get('/api/telegram/settings', { params: { shop_id: shopId } }).then((r) => r.data);
export const setTelegramWebhook = (shopId) => api.post('/api/telegram/setwebhook', null, { params: { shop_id: shopId } }).then((r) => r.data);

// POS
export const createPosOrder = (data) => api.post('/api/orders/pos', data).then((r) => r.data);

// Backup
export const createShopBackup = (shopId, format = '') =>
  api.post(`/api/backup/shop/${shopId}/create`, null, { params: { format } }).then((r) => r.data);
export const exportShopBackup = (shopId, format = 'xlsx') =>
  api.get(`/api/backup/shop/${shopId}/export`, { params: { export_format: format }, responseType: 'blob' }).then((r) => r.data);
export const importShopBackup = (shopId, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post(`/api/backup/shop/${shopId}/import`, fd).then((r) => r.data);
};
export const backupHistory = (shopId) => api.get('/api/backup/history', { params: { shop_id: shopId } }).then((r) => r.data);
export const getBackupDownload = (filename) => api.get('/api/backup/download', { params: { filename } }).then((r) => r.data);

export default api;
