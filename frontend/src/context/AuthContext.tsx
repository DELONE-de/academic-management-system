// src/context/AuthContext.tsx

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User, AuthContextType } from '@/types';
import { authApi } from '@/lib/api';
import { getStoredUser, setStoredUser, getToken, setToken, clearSession } from '@/lib/session';
import { toFriendlyError } from '@/lib/errors';
import toast from 'react-hot-toast';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // On mount, hydrate from the stored token by fetching the profile.
  // The JWT lives in localStorage under a dedicated key; the api.ts request
  // interceptor attaches it as an Authorization header automatically.
  //
  // `cancelled` guards against overlapping hydration runs (React StrictMode
  // double-invokes this effect in dev). Without it, a transient failure of
  // run #1 could clearSession() after run #2 already restored the user,
  // bouncing an authenticated visitor back to /login.
  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      // A cached user without a stored token is NOT a valid session under
      // header-based auth — skip the /profile call entirely instead of
      // firing a pointless 401 that would be misread as "session expired".
      // RouteGuard redirects to /login silently.
      const token = getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const cached = getStoredUser<User>();
        if (cached) setUser(cached);

        // Verify session against the backend (Bearer header attached by interceptor)
        const response = await authApi.getProfile();
        if (cancelled) return;
        if (response.success) {
          setUser(response.data);
          setStoredUser(response.data);
        } else {
          clearSession();
          setUser(null);
        }
      } catch {
        if (cancelled) return;
        clearSession();
        setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  // Listen for session invalidation from any API call (expired token, etc.).
  // This clears user state reactively; RouteGuard handles the redirect, so we
  // avoid the full-page-reload loop that a hard `window.location.href` causes.
  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
      clearSession();
      setIsLoading(false);
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authApi.login(email, password);

      // Never treat the login as complete without a token in the response —
      // navigating with no stored token would leave RouteGuard bouncing the
      // user straight back to /login despite the 200.
      if (response.success && response.data?.token) {
        // Store the JWT (attached by the api.ts interceptor on every request)
        // and the non-sensitive user data for UI hydration.
        setToken(response.data.token);
        setUser(response.data.user);
        setStoredUser(response.data.user);
        toast.success('Login successful!');
        router.push('/dashboard');
      } else {
        toast.error(response.message || 'Login failed');
      }
    } catch (error: any) {
      const friendly = toFriendlyError(error);
      toast.error(friendly.kind === 'auth' ? 'Invalid email or password.' : friendly.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(async () => {
    // Acknowledge logout server-side (stateless JWT — no server session),
    // then discard the local token and user state
    try {
      await authApi.logout();
    } catch {
      // Even if the logout request fails, clear local session state
    }
    setUser(null);
    clearSession();
    toast.success('Logged out successfully');
    router.push('/login');
  }, [router]);

  const value: AuthContextType = {
    user,
    login,
    logout,
    isLoading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}