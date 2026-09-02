// src/components/layout/DashboardLayout.tsx

'use client';

import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from './ErrorBoundary';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}