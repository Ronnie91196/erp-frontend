import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api', timeout: 20000 });
api.interceptors.request.use(config => { const token = localStorage.getItem('pharma_token'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
api.interceptors.response.use(r => r, e => { if (e.response?.status === 401 && location.pathname !== '/login') { localStorage.removeItem('pharma_token'); localStorage.removeItem('pharma_user'); location.href='/login'; } return Promise.reject(e); });
export const unwrap = r => r?.data?.data ?? r?.data;
export const apiError = e => e?.response?.data?.message || e?.message || 'Request failed';
export default api;
