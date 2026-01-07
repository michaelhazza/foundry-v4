const API_BASE = '/api';

// Auth endpoints where 401 is expected (not an error)
const AUTH_ENDPOINTS = [
  '/auth/me',
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
];

// Pages where we should NEVER redirect (already handling auth)
const AUTH_PAGES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/accept-invitation',
];

interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

class ApiClient {
  private isRefreshing = false;

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: { code: 'UNKNOWN', message: response.statusText },
      }));

      // Handle 401
      if (response.status === 401) {
        const isAuthEndpoint = AUTH_ENDPOINTS.some((e) => endpoint.startsWith(e));
        const isOnAuthPage = AUTH_PAGES.some((p) => window.location.pathname.startsWith(p));

        // Auth endpoints returning 401 is NORMAL
        if (isAuthEndpoint) {
          throw new Error(errorData.error.message || 'Unauthorized');
        }

        // Don't redirect if already on auth page
        if (isOnAuthPage) {
          throw new Error(errorData.error.message || 'Authentication failed');
        }

        // Try token refresh
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          try {
            const refreshed = await this.refreshToken();
            if (refreshed) {
              this.isRefreshing = false;
              return this.request<T>(endpoint, options);
            }
          } catch {
            // Refresh failed
          }
          this.isRefreshing = false;
        }

        // Clear and redirect
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        throw new Error('Session expired');
      }

      throw new Error(errorData.error.message || 'Request failed');
    }

    const data = await response.json();
    return data.data;
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;

      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data?.accessToken) {
          localStorage.setItem('accessToken', data.data.accessToken);
          if (data.data.refreshToken) {
            localStorage.setItem('refreshToken', data.data.refreshToken);
          }
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint);
  }

  post<T>(endpoint: string, data?: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch<T>(endpoint: string, data: unknown) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  put<T>(endpoint: string, data: unknown) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }

  async upload<T>(endpoint: string, formData: FormData) {
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: { message: 'Upload failed' },
      }));
      throw new Error(errorData.error.message || 'Upload failed');
    }

    const data = await response.json();
    return data.data as T;
  }
}

export const api = new ApiClient();
