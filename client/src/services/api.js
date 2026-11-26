import axios from 'axios';

const API = axios.create({
  baseURL: '/api'
});

// Request Interceptor: Attach Bearer Token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response Interceptor: Handle 401 Unauthorized
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear expired token if 401
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => API.post('/auth/login', credentials),
  register: (userData) => API.post('/auth/register', userData),
  getMe: () => API.get('/auth/me')
};

export const fileAPI = {
  uploadFile: (formData, onProgress) => API.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    }
  }),
  listFiles: (params) => API.get('/files', { params }),
  getFileUrl: (id, action) => API.get(`/files/${id}/url`, { params: { action } }),
  deleteFile: (id) => API.delete(`/files/${id}`)
};

export const userAPI = {
  listUsers: () => API.get('/users'),
  updateUserRole: (id, role_id) => API.patch(`/users/${id}/role`, { role_id }),
  getStats: () => API.get('/users/stats')
};

export const projectAPI = {
  // Projects
  getProjects: () => API.get('/projects'),
  createProject: (data) => API.post('/projects', data),
  deleteProject: (id) => API.delete(`/projects/${id}`),
  // Packages
  getPackages: (projectId) => API.get(`/projects/${projectId}/packages`),
  createPackage: (projectId, data) => API.post(`/projects/${projectId}/packages`, data),
  seedBlowerQap: (packageId) => API.post(`/packages/${packageId}/seed-blower-qap`),
  deletePackage: (id) => API.delete(`/packages/${id}`),
  // Requirements
  getRequirements: (packageId) => API.get(`/packages/${packageId}/requirements`),
  createRequirement: (packageId, data) => API.post(`/packages/${packageId}/requirements`, data),
  deleteRequirement: (id) => API.delete(`/requirements/${id}`),
  // Requirement Files
  getRequirementFiles: (requirementId) => API.get(`/requirements/${requirementId}/files`),
  uploadRequirementFile: (requirementId, formData, onProgress) =>
    API.post(`/requirements/${requirementId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => { if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total)); }
    }),
  markFileComplete: (id) => API.patch(`/requirement-files/${id}/complete`),
  deleteRequirementFile: (id) => API.delete(`/requirement-files/${id}`),
  // Reorder components
  reorderRequirements: (packageId, orderedIds) =>
    API.patch(`/packages/${packageId}/requirements/reorder`, { orderedIds }),
  // PDF Export
  exportProjectPdf: (projectId, orderPayload) =>
    API.post(`/projects/${projectId}/export-pdf`, orderPayload, { responseType: 'blob' })
};

export const shareAPI = {
  // Creator actions (Protected)
  generateLink: (data) => API.post('/share-upload/generate', data),
  getMyLinks: () => API.get('/share-upload/my-links'),
  revokeLink: (id) => API.patch(`/share-upload/${id}/revoke`),
  deleteLink: (id) => API.delete(`/share-upload/${id}`),

  // Guest / Recipient actions (Public, Rate-limited)
  getLinkInfo: (token) => API.get(`/share-upload/${token}/info`),
  verifyOtp: (token, otp) => API.post(`/share-upload/${token}/verify-otp`, { otp }),
  uploadFile: (token, formData, onProgress) =>
    API.post(`/share-upload/${token}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      }
    })
};

export default API;
