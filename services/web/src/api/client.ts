const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    statusCode: number;
    details?: any;
  };
  message?: string;
}

export const generateCorrelationId = (): string => {
  return 'req-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now();
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem('mediconnect_access_token');
  const correlationId = generateCorrelationId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-correlation-id': correlationId,
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err: any) {
    return {
      success: false,
      error: {
        message: err.message || 'Network error occurred. Unable to connect to MediConnect server.',
        statusCode: 0,
      },
    };
  }

  // Handle Token Refresh on 401 Unauthorized
  if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
    const refreshToken = localStorage.getItem('mediconnect_refresh_token');
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          if (refreshData.success && refreshData.data?.accessToken) {
            localStorage.setItem('mediconnect_access_token', refreshData.data.accessToken);
            localStorage.setItem('mediconnect_refresh_token', refreshData.data.refreshToken);

            // Retry original request with fresh access token
            headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
            const retryRes = await fetch(url, { ...options, headers });
            return retryRes.json();
          }
        }
      } catch {
        // Refresh failed, proceed to return original 401
      }
    }

    // Clear tokens if refresh failed or no refresh token
    localStorage.removeItem('mediconnect_access_token');
    localStorage.removeItem('mediconnect_refresh_token');
    localStorage.removeItem('mediconnect_user');
  }

  try {
    const data = await response.json();
    return data;
  } catch {
    return {
      success: response.ok,
      message: response.statusText,
    };
  }
}
