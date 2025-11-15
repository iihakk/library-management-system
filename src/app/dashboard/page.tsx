'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // LIB-09 FR3: Logout functionality
      await logout();
      // Redirect to public catalog view (or home page)
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Navigation Bar */}
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">Library Management System</h1>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-700">
                  Welcome, <strong>{user?.displayName || user?.email}</strong>
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h2>

              {/* User Info Card */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Account Information</h3>
                <div className="space-y-2">
                  <p className="text-blue-800">
                    <span className="font-medium">Name:</span> {user?.displayName || 'Not set'}
                  </p>
                  <p className="text-blue-800">
                    <span className="font-medium">Email:</span> {user?.email}
                  </p>
                  <p className="text-blue-800">
                    <span className="font-medium">Email Verified:</span>{' '}
                    {user?.emailVerified ? (
                      <span className="text-green-600 font-medium">✓ Verified</span>
                    ) : (
                      <span className="text-yellow-600 font-medium">⚠ Not Verified</span>
                    )}
                  </p>
                  <p className="text-blue-800">
                    <span className="font-medium">User ID:</span> {user?.uid}
                  </p>
                </div>
              </div>

              {/* Email Verification Notice */}
              {!user?.emailVerified && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-yellow-400"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Email Verification Required
                      </h3>
                      <div className="mt-2 text-sm text-yellow-700">
                        <p>
                          Please check your email inbox and click the verification link to activate your
                          account.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Links */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-semibold text-gray-900 mb-2">Browse Catalog</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Search and browse available library items
                  </p>
                  <Link
                    href="/catalog"
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Go to Catalog →
                  </Link>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-semibold text-gray-900 mb-2">My Loans</h4>
                  <p className="text-sm text-gray-600 mb-3">View your current borrowed items</p>
                  <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                    View Loans →
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-semibold text-gray-900 mb-2">My Holds</h4>
                  <p className="text-sm text-gray-600 mb-3">Manage your reserved items</p>
                  <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                    View Holds →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
