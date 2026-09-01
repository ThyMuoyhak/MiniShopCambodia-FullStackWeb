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
    return Promise.reject(err);
  }
);

// Auth
export const login = (data) => api.post('/api/auth/login', data).then((r) => r.data);
export const changePassword = (data) => api.post('/api/auth/change-password', data).then((r) => r.data);

// Reseller dashboard
export const resellerMe = () => api.get('/api/plans/reseller/me').then((r) => r.data);
export const resellerPromo = (data) => api.post('/api/plans/reseller/promo', data).then((r) => r.data);
export const resellerExport = (format = 'zip') =>
  api.get('/api/plans/reseller/export', { params: { export_format: format }, responseType: 'blob' }).then((r) => r.data);
export const resellerImport = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/api/plans/reseller/import', fd).then((r) => r.data);
};
