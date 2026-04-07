import axios from 'axios'
import { ElMessage } from 'element-plus'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    const message = error.response?.data?.error || error.message || '请求失败'
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export const apiService = {
  async getApis(params = {}) {
    return api.get('/apis', { params })
  },

  async getApi(id) {
    return api.get(`/apis/${id}`)
  },

  async createApi(data) {
    return api.post('/apis', data)
  },

  async updateApi(id, data) {
    return api.put(`/apis/${id}`, data)
  },

  async deleteApi(id) {
    return api.delete(`/apis/${id}`)
  },

  async executeApi(id, options = {}) {
    return api.post(`/apis/${id}/execute`, { options })
  },

  async getCategories() {
    return api.get('/categories')
  },

  async getTags() {
    return api.get('/tags')
  }
}

export const taskService = {
  async getTasks(params = {}) {
    return api.get('/tasks', { params })
  },

  async getTask(id) {
    return api.get(`/tasks/${id}`)
  },

  async createTask(data) {
    return api.post('/tasks', data)
  },

  async updateTask(id, data) {
    return api.put(`/tasks/${id}`, data)
  },

  async deleteTask(id) {
    return api.delete(`/tasks/${id}`)
  },

  async runTask(id) {
    return api.post(`/tasks/${id}/run`)
  },

  async getTaskHistory(id) {
    return api.get(`/tasks/${id}/history`)
  },

  async previewTask(id) {
    return api.post(`/tasks/${id}/preview`)
  },

  async executeApi(id, apiIndex) {
    return api.post(`/tasks/${id}/execute-api/${apiIndex}`)
  }
}

export const reportTemplateService = {
  async getTemplates(params = {}) {
    return api.get('/report-templates', { params })
  },

  async getTemplate(id) {
    return api.get(`/report-templates/${id}`)
  },

  async createTemplate(data) {
    return api.post('/report-templates', data)
  },

  async updateTemplate(id, data) {
    return api.put(`/report-templates/${id}`, data)
  },

  async deleteTemplate(id) {
    return api.delete(`/report-templates/${id}`)
  },

  async duplicateTemplate(id) {
    return api.post(`/report-templates/${id}/duplicate`)
  },

  async previewTemplate(id, sampleData) {
    return api.post(`/report-templates/${id}/preview`, { sampleData })
  },

  async generateReport(templateId, data) {
    return api.post('/report-templates/generate', { templateId, data })
  }
}

export const docService = {
  async getDocuments() {
    return api.get('/docs/list')
  },

  downloadDocument(filename) {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    window.open(`${baseUrl}/api/docs/download/${filename}`)
  },

  async deleteDocument(filename) {
    return api.delete(`/docs/${filename}`)
  }
}

export const captureService = {
  async captureRequests(requests) {
    return api.post('/capture', {
      requests,
      timestamp: new Date().toISOString(),
      source: 'browser-extension'
    })
  }
}

export default api
