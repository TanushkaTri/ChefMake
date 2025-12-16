import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Type definition for the authenticated user
interface User {
  id: string;
  name: string;
  email: string;
  xp: number;
  level: number;
  avatar?: string;
  token?: string; 
}

// Interface for the authentication context
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginWithProvider: (provider: "google" | "github") => Promise<void>;
  loginWithSupabaseToken: (accessToken: string) => Promise<boolean>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (token: string, password: string) => Promise<{ success: boolean; message?: string }>;
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; message?: string }>;
  isLoading: boolean;
}

// Create the authentication context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to access the authentication context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// AuthProvider component to wrap the app and manage auth state
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Persist user and token in localStorage
  const saveUserToLocalStorage = (userData: User, token: string) => {
    const userToStore = { ...userData, token };
    localStorage.setItem('chefmake_user', JSON.stringify(userToStore));
    setUser(userToStore);
  };

  // Clear user data from localStorage
  const removeUserFromLocalStorage = () => {
    localStorage.removeItem('chefmake_user');
    setUser(null);
  };

  // Exchange Supabase access token for local JWT
  const exchangeSupabaseToken = async (accessToken: string) => {
    if (!API_BASE_URL) {
      console.error("API_BASE_URL is not configured");
      return false;
    }

    try {
      const url = `${API_BASE_URL}/api/auth/supabase-login`;
      console.log("Attempting Supabase token exchange to:", url);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Проверяем Content-Type перед парсингом JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error("Supabase token exchange failed: Server returned non-JSON response", {
          status: response.status,
          statusText: response.statusText,
          contentType,
          url,
          body: text.substring(0, 200), // первые 200 символов для отладки
        });
        return false;
      }

      const data = await response.json();
      if (response.ok) {
        saveUserToLocalStorage(data.user, data.token);
        return true;
      } else {
        console.error("Supabase token exchange failed:", data);
      }
    } catch (err) {
      console.error("Supabase token exchange failed", err);
    }
    return false;
  };

  const loginWithSupabaseToken = async (accessToken: string) => {
    return exchangeSupabaseToken(accessToken);
  };

  // Load and validate stored user on initial mount
  useEffect(() => {
    const loadUser = async () => {
      const storedUserString = localStorage.getItem('chefmake_user');
      if (storedUserString) {
        try {
          const storedUser: User = JSON.parse(storedUserString);
          if (storedUser.token && API_BASE_URL) {
            const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${storedUser.token}`,
              },
            });

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              if (response.ok) {
                const data = await response.json();
                saveUserToLocalStorage(data.user, storedUser.token);
              } else {
                console.warn('Token is invalid or expired.');
                removeUserFromLocalStorage();
              }
            } else {
              console.warn('Server returned non-JSON response for /auth/me');
              removeUserFromLocalStorage();
            }
          } else {
            if (!API_BASE_URL) {
              console.error('API_BASE_URL is not configured');
            }
            removeUserFromLocalStorage();
          }
        } catch (error) {
          console.error('Error loading user:', error);
          removeUserFromLocalStorage();
        }
      }

      // Try Supabase session if no local user
      if (!storedUserString) {
        const { data } = await supabase.auth.getSession();
        const supaToken = data.session?.access_token;
        if (supaToken) {
          const ok = await exchangeSupabaseToken(supaToken);
          if (!ok) {
            removeUserFromLocalStorage();
          }
        }
      }

      setIsLoading(false);
    };

    loadUser();
  }, []);

  // Handle login
  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      if (!API_BASE_URL) {
        return { success: false, message: 'API_BASE_URL is not configured' };
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error("Login failed: Server returned non-JSON response", {
          status: response.status,
          statusText: response.statusText,
          contentType,
          body: text.substring(0, 200),
        });
        return { success: false, message: `Server error: ${response.status} ${response.statusText}` };
      }

      const data = await response.json();

      if (response.ok) {
        saveUserToLocalStorage(data.user, data.token);
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Не удалось войти.' };
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      return { success: false, message: error.message || 'Сетевая ошибка при входе.' };
    } finally {
      setIsLoading(false);
    }
  };

  // Handle user registration
  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      if (!API_BASE_URL) {
        return { success: false, message: 'API_BASE_URL is not configured' };
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error("Registration failed: Server returned non-JSON response", {
          status: response.status,
          statusText: response.statusText,
          contentType,
          body: text.substring(0, 200),
        });
        return { success: false, message: `Server error: ${response.status} ${response.statusText}` };
      }

      const data = await response.json();
      console.log(data);

      if (response.ok) {
        saveUserToLocalStorage(data.user, data.token);
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Не удалось зарегистрироваться.' };
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      return { success: false, message: error.message || 'Сетевая ошибка при регистрации.' };
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithProvider = async (provider: "google" | "github") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: import.meta.env.VITE_SUPABASE_REDIRECT,
      },
    });
  };

  // Clear user data and optionally notify backend
  const logout = () => {
    removeUserFromLocalStorage();
    supabase.auth.signOut().catch(() => {});
    // Optionally trigger backend logout if using sessions
    // Example: fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${user?.token}` } });
  };

  // Send forgot password request
  const forgotPassword = async (email: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, message: data.message || 'Ссылка для сброса отправлена.' };
      } else {
        return { success: false, message: data.message || 'Не удалось отправить ссылку.' };
      }
    } catch (error: any) {
      console.error('Forgot password failed:', error);
      return { success: false, message: error.message || 'Ошибка сети при запросе сброса пароля.' };
    }
  };

  // Reset password using token
  const resetPassword = async (token: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, message: data.message || 'Пароль успешно сброшен.' };
      } else {
        return { success: false, message: data.message || 'Не удалось сбросить пароль.' };
      }
    } catch (error: any) {
      console.error('Reset password failed:', error);
      return { success: false, message: error.message || 'Сетевая ошибка при сбросе пароля.' };
    }
  };

  // Update user profile
  const updateProfile = async (updates: Partial<User>): Promise<{ success: boolean; message?: string }> => {
    if (!user || !user.token) {
      return { success: false, message: 'Пользователь не авторизован.' };
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`,
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (response.ok) {
        saveUserToLocalStorage(data.user, user.token);
        return { success: true, message: 'Профиль успешно обновлён.' };
      } else {
        return { success: false, message: data.message || 'Не удалось обновить профиль.' };
      }
    } catch (error: any) {
      console.error('Update profile failed:', error);
      return { success: false, message: error.message || 'Сетевая ошибка при обновлении профиля.' };
    } finally {
      setIsLoading(false);
    }
  };

  // Provide authentication state and actions to consumers
  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        loginWithProvider,
        loginWithSupabaseToken,
        logout,
        forgotPassword,
        resetPassword,
        updateProfile,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
