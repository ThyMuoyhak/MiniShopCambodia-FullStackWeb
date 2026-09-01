import axios from 'axios';

export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: API_BASE });

// Attach token to every request
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

// Shops
export const listShops = () => api.get('/api/shops').then((r) => r.data);
export const createShop = (data) => api.post('/api/shops', data).then((r) => r.data);
export const updateShopStatus = (id, status) => api.put(`/api/shops/${id}/status`, { status }).then((r) => r.data);
export const deleteShop = (id) => api.delete(`/api/shops/${id}`).then((r) => r.data);
export const getShopDetail = (id) => api.get(`/api/shops/${id}/detail`).then((r) => r.data);
export const setShopExpiry = (id, days) => api.post(`/api/shops/${id}/set-expiry`, { days }).then((r) => r.data);
export const setShopLimits = (id, data) => api.post(`/api/shops/${id}/set-limits`, data).then((r) => r.data);

// Plans / resellers
export const listResellers = () => api.get('/api/plans/resellers').then((r) => r.data);
export const createReseller = (data) => api.post('/api/plans/resellers', data).then((r) => r.data);
export const updateReseller = (id, data) => api.put(`/api/plans/resellers/${id}`, data).then((r) => r.data);
export const deleteReseller = (id) => api.delete(`/api/plans/resellers/${id}`).then((r) => r.data);
export const resellerCustomers = (id) => api.get(`/api/plans/resellers/${id}/customers`).then((r) => r.data);
export const getReseller = (id) => api.get(`/api/plans/resellers/${id}`).then((r) => r.data);

// Shop data management (admin can manage any shop's content)
export const listShopProducts = (shopId) => api.get('/api/products', { params: { shop_id: shopId } }).then((r) => r.data);
export const createProduct = (data) => api.post('/api/products', data).then((r) => r.data);
export const updateProduct = (id, data) => api.put(`/api/products/${id}`, data).then((r) => r.data);
export const deleteProduct = (id) => api.delete(`/api/products/${id}`).then((r) => r.data);

export const listShopCategories = (shopId) => api.get('/api/categories', { params: { shop_id: shopId } }).then((r) => r.data);
export const createCategory = (data) => api.post('/api/categories', data).then((r) => r.data);
export const updateCategory = (id, data) => api.put(`/api/categories/${id}`, data).then((r) => r.data);
export const deleteCategory = (id) => api.delete(`/api/categories/${id}`).then((r) => r.data);

export const listShopOrders = (shopId) => api.get('/api/orders', { params: { shop_id: shopId } }).then((r) => r.data);
export const getOrder = (id) => api.get(`/api/orders/${id}`).then((r) => r.data);
export const updateOrderStatus = (id, data) => api.put(`/api/orders/${id}/status`, data).then((r) => r.data);
export const deleteOrder = (id) => api.delete(`/api/orders/${id}`).then((r) => r.data);

export const listShopCustomers = (shopId, search) =>
  api.get('/api/customers', { params: { shop_id: shopId, search } }).then((r) => r.data);
export const deleteCustomer = (id) => api.delete(`/api/customers/${id}`).then((r) => r.data);

// Users
export const listUsers = () => api.get('/api/auth/users').then((r) => r.data);
export const createUser = (data) => api.post('/api/auth/register', data).then((r) => r.data);
export const updateUser = (id, data) => api.put(`/api/auth/users/${id}`, data).then((r) => r.data);
export const deleteUser = (id) => api.delete(`/api/auth/users/${id}`).then((r) => r.data);

// Stats / activity / backups / settings
export const getStats = () => api.get('/api/settings/stats').then((r) => r.data);
export const getPlatformCharts = () => api.get('/api/plans/charts').then((r) => r.data);
export const getActivity = (params = {}) => api.get('/api/activity', { params }).then((r) => r.data);
export const createSystemBackup = (format = '') =>
  api.post('/api/backup/admin/create', null, { params: format ? { format } : {} }).then((r) => r.data);
export const exportSystemBackup = (format = 'xlsx', onProgress) =>
  api.get('/api/backup/admin/export', {
    params: { export_format: format },
    responseType: 'blob',
    onDownloadProgress: onProgress,
  }).then((r) => r.data);
export const exportShopBackup = (shopId, format = 'xlsx', onProgress) =>
  api.get(`/api/backup/shop/${shopId}/export`, {
    params: { export_format: format },
    responseType: 'blob',
    onDownloadProgress: onProgress,
  }).then((r) => r.data);
export const importSystemBackup = (file, onProgress) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/api/backup/admin/import', fd, { onUploadProgress: onProgress }).then((r) => r.data);
};
export const backupHistory = () => api.get('/api/backup/history').then((r) => r.data);
export const getBackupDownload = (filename) => api.get('/api/backup/download', { params: { filename } }).then((r) => r.data);
export const getPlatformSettings = () => api.get('/api/settings/platform').then((r) => r.data);

export default api;
