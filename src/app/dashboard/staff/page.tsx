'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function StaffDashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  // Redirect if not staff
  useEffect(() => {
    if (user && user.role !== 'staff' && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
        {/* Navigation */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <Link href="/" className="text-xl font-bold text-gray-900">
                  ULMS
                </Link>
                <Link href="/catalog" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                  Catalog
                </Link>
                <Link href="/dashboard/staff" className="text-primary-600 border-b-2 border-primary-600 px-3 py-2 text-sm font-medium">
                  Staff Dashboard
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.displayName}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Staff Dashboard</h1>
            <p className="mt-2 text-gray-600">Welcome, {user?.displayName}</p>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Staff Features</h2>
            <p className="text-gray-600">
              Staff dashboard functionality will be implemented here. This may include:
            </p>
            <ul className="list-disc list-inside mt-4 space-y-2 text-gray-600">
              <li>Manage book loans and returns</li>
              <li>Process holds and reservations</li>
              <li>View user accounts and activity</li>
              <li>Generate reports</li>
            </ul>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

