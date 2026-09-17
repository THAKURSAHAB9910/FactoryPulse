import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthState } from '../types';
import { api } from '../api/client';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('fp_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      if (token) {
        const currentUser = await api.getMe();
        setUser(currentUser);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to authenticate stored token:', err);
      setUser(null);
      setToken(null);
      localStorage.removeItem('fp_auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, [token]);

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await api.login(username, password);
      localStorage.setItem('fp_auth_token', data.access_token);
      setToken(data.access_token);
      setUser({
        user_id: data.user_id,
        username: data.username,
        email: `${data.username}@factorypulse.io`,
        full_name: data.full_name,
        role: data.role as any,
        is_active: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('fp_auth_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
