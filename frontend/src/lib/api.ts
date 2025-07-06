const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'

// For production, we'll use a public API endpoint once SSO is resolved
// const PRODUCTION_API_URL = 'https://nxt-erp-backend-ou9mb97ly-nxt-9032fd74.vercel.app'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

class ApiClient {
  private baseURL: string
  
  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    // Add auth token if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      }
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`)
      }

      return data
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // Dashboard API methods
  async getDashboardStats() {
    return this.request<any>('/dashboard/stats')
  }

  async getDashboardActivities(limit: number = 10) {
    return this.request<any>(`/dashboard/activities?limit=${limit}`)
  }

  async getDashboardIntegrations() {
    return this.request<any>('/dashboard/integrations')
  }

  // Auth API methods
  async login(email: string, password: string) {
    return this.request<{
      user: any
      access_token: string
      refresh_token: string
      expires_in: string
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    })
  }

  async refreshToken(refreshToken: string) {
    return this.request<{
      access_token: string
      refresh_token: string
      expires_in: string
    }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
  }

  async getProfile() {
    return this.request<any>('/auth/profile')
  }

  async updateProfile(data: any) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Convenience methods for common HTTP operations
  async get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

// Create and export a singleton instance
export const apiClient = new ApiClient()

// For backward compatibility, also export as 'api'
export const api = apiClient

// Export individual API functions for convenience
export const dashboardApi = {
  getStats: () => apiClient.getDashboardStats(),
  getActivities: (limit?: number) => apiClient.getDashboardActivities(limit),
  getIntegrations: () => apiClient.getDashboardIntegrations(),
}

export const authApi = {
  login: (email: string, password: string) => apiClient.login(email, password),
  logout: () => apiClient.logout(),
  refresh: (token: string) => apiClient.refreshToken(token),
  getProfile: () => apiClient.getProfile(),
  updateProfile: (data: any) => apiClient.updateProfile(data),
}

export default apiClient