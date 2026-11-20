import { create } from 'zustand';
import { apiRequest } from '../api/client';

export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  patient?: {
    id: string;
    bloodGroup?: string;
    dateOfBirth?: string;
  };
  doctor?: {
    id: string;
    specialization: string;
    licenseNumber: string;
    isVerified: boolean;
  };
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: { email: string; password: string }) => Promise<boolean>;
  register: (payload: any) => Promise<boolean>;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('mediconnect_access_token'),
  refreshToken: localStorage.getItem('mediconnect_refresh_token'),
  isAuthenticated: !!localStorage.getItem('mediconnect_access_token'),
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async ({ email, password }) => {
    set({ isLoading: true, error: null });
    const response = await apiRequest<{
      user: UserProfile;
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success && response.data) {
      const { user, accessToken, refreshToken } = response.data;
      localStorage.setItem('mediconnect_access_token', accessToken);
      localStorage.setItem('mediconnect_refresh_token', refreshToken);
      localStorage.setItem('mediconnect_user', JSON.stringify(user));

      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } else {
      set({
        isLoading: false,
        error: response.error?.message || 'Invalid credentials or login failed.',
      });
      return false;
    }
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    const response = await apiRequest<{
      user: UserProfile;
      accessToken: string;
      refreshToken: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (response.success && response.data) {
      const { user, accessToken, refreshToken } = response.data;
      localStorage.setItem('mediconnect_access_token', accessToken);
      localStorage.setItem('mediconnect_refresh_token', refreshToken);
      localStorage.setItem('mediconnect_user', JSON.stringify(user));

      set({
        user,
        accessToken,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      return true;
    } else {
      set({
        isLoading: false,
        error: response.error?.message || 'Registration failed. Please check your details.',
      });
      return false;
    }
  },

  logout: async () => {
    const refreshToken = get().refreshToken;
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Continue client cleanup even if network fails
    }

    localStorage.removeItem('mediconnect_access_token');
    localStorage.removeItem('mediconnect_refresh_token');
    localStorage.removeItem('mediconnect_user');

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  initAuth: async () => {
    const storedUser = localStorage.getItem('mediconnect_user');
    const token = localStorage.getItem('mediconnect_access_token');

    if (token && storedUser) {
      try {
        set({ user: JSON.parse(storedUser), isAuthenticated: true });
        // Verify with /auth/me in background
        const res = await apiRequest<{ user: UserProfile }>('/auth/me');
        if (res.success && res.data) {
          set({ user: res.data.user });
          localStorage.setItem('mediconnect_user', JSON.stringify(res.data.user));
        }
      } catch {
        // Failed session check
      }
    }
  },
}));
