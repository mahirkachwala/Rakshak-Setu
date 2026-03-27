import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: any | null;
  setAuth: (token: string, user: any) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('swasthya_token'),
  user: localStorage.getItem('swasthya_user') ? JSON.parse(localStorage.getItem('swasthya_user')!) : null,
  setAuth: (token, user) => {
    localStorage.setItem('swasthya_token', token);
    localStorage.setItem('swasthya_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('swasthya_token');
    localStorage.removeItem('swasthya_user');
    set({ token: null, user: null });
  }
}));

export const getAuthHeaders = () => {
  const token = localStorage.getItem('swasthya_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};
