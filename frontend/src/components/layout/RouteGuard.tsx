// FILE: frontend/src/components/layout/RouteGuard.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { canAccessPath } from '@/lib/navigation';

interface RouteGuardProps {
  children: React.ReactNode;
  pathname: string;
}

export function RouteGuard({ children, pathname }: RouteGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!canAccessPath(pathname, user?.role)) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, user, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!canAccessPath(pathname, user?.role)) return null;

  return <>{children}</>;
}