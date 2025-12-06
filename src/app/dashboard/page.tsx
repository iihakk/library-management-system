'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

const API_BASE_URL = 'http://localhost:5000/api';

interface Loan {
  id: number;
  book_id: number;
  title: string;  // Backend returns title, not book_title
  author: string; // Backend returns author, not book_author
  isbn?: string;
  loan_date: string;
  due_date: string;
  return_date?: string;
  status: 'active' | 'returned' | 'overdue';
}

interface Hold {
  id: number;
  book_id: number;
  title?: string;
  book_title?: string;
  author?: string;
  book_author?: string;
  hold_date: string;
  expiry_date: string | null;
  expiry_datetime: string | null;
  status: 'pending' | 'available' | 'cancelled' | 'expired';
  fee_amount?: number;
  fee_applied?: boolean;
  queue_position?: number;
  total_queue?: number;
}

interface Fine {
  id: number;
  amount: number;
  type: 'hold_expiry' | 'overdue' | 'damage' | 'lost';
  status: 'pending' | 'paid' | 'waived';
  loan_id: number | null;
  hold_id: number | null;
  book_title?: string;
  book_author?: string;
  description?: string;
  created_at: string;
  paid_at?: string | null;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [holds, setHolds] = useState<Hold[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [payingFineId, setPayingFineId] = useState<number | null>(null);

  // Redirect based on role
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        router.push('/dashboard/admin');
        return;
      } else if (user.role === 'staff') {
        router.push('/dashboard/staff');
        return;
      }
      // Regular users stay on this page
    }
  }, [user, router]);

  // Fetch user data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Fetch loans, holds, and fines in parallel
      const [loansRes, holdsRes, finesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/loans`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/holds`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/fines`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (loansRes.ok) {
        const loansData = await loansRes.json();
        // Backend returns array directly, not wrapped in object
        setLoans(Array.isArray(loansData) ? loansData : loansData.loans || []);
      }

      if (holdsRes.ok) {
        const holdsData = await holdsRes.json();
        // Backend returns array directly, not wrapped in object
        setHolds(Array.isArray(holdsData) ? holdsData : holdsData.holds || []);
      }

      if (finesRes.ok) {
        const finesData = await finesRes.json();
        setFines(finesData.fines || []);
        setTotalPending(finesData.totalPending || 0);
      }

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Refresh data every 30 seconds to update countdown timers
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Calculate remaining time for hold (in milliseconds)
  const getHoldRemainingTime = (expiryDatetime: string | null): number => {
    if (!expiryDatetime) return 0;
    const expiry = new Date(expiryDatetime);
    const now = new Date();
    return Math.max(0, expiry.getTime() - now.getTime());
  };

  // Format remaining time for display
  const formatRemainingTime = (milliseconds: number): string => {
    if (milliseconds <= 0) return 'Expired';
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Calculate days remaining
  const getDaysRemaining = (dueDate: string): number => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get status badge color
  const getStatusColor = (daysRemaining: number) => {
    if (daysRemaining < 0) return 'bg-red-100 text-red-800 border-red-200';
    if (daysRemaining <= 3) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getStatusText = (daysRemaining: number) => {
    if (daysRemaining < 0) return `Overdue by ${Math.abs(daysRemaining)} days`;
    if (daysRemaining === 0) return 'Due today';
    if (daysRemaining === 1) return 'Due tomorrow';
    return `${daysRemaining} days remaining`;
  };

  // Hold Countdown Component
  const HoldCountdown = ({ expiryDatetime }: { expiryDatetime: string }) => {
    const [remainingTime, setRemainingTime] = useState(getHoldRemainingTime(expiryDatetime));

    useEffect(() => {
      const interval = setInterval(() => {
        const time = getHoldRemainingTime(expiryDatetime);
        setRemainingTime(time);
      }, 1000);

      return () => clearInterval(interval);
    }, [expiryDatetime]);

    const formatted = formatRemainingTime(remainingTime);
    const isExpiringSoon = remainingTime < 2 * 60 * 60 * 1000; // Less than 2 hours
    const isExpired = remainingTime <= 0;

    return (
      <div className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-semibold ${
        isExpired 
          ? 'bg-red-100 text-red-800 border-2 border-red-300' 
          : isExpiringSoon 
          ? 'bg-orange-100 text-orange-800 border-2 border-orange-300' 
          : 'bg-blue-100 text-blue-800 border-2 border-blue-300'
      }`}>
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {formatted}
      </div>
    );
  };

  // Handle renew
  const handleRenew = async (loanId: number, bookTitle: string) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Request renewal for "${bookTitle}"?\n\n` +
      `Note: Renewal requests are sent to the admin panel for approval.\n` +
      `You will be notified once your request is reviewed.`
    );

    if (!confirmed) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/loans/${loanId}/renew`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setSuccessMessage('Renewal request submitted successfully! Your request will be reviewed by the admin. You will be notified of the decision.');
        setTimeout(() => setSuccessMessage(''), 5000);
        fetchDashboardData(); // Refresh data
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit renewal request');
      }
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  // Books must be returned at the library

  // Handle pay fine
  const handlePayFine = async (fineId: number) => {
    try {
      setPayingFineId(fineId);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/fines/${fineId}/pay`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setSuccessMessage('Fine paid successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchDashboardData();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to pay fine');
      }
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    } finally {
      setPayingFineId(null);
    }
  };

  // Handle cancel hold
  const handleCancelHold = async (holdId: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/holds/${holdId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setSuccessMessage('Hold cancelled successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchDashboardData(); // Refresh data
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel hold');
      }
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  // Calculate totals
  const totalFines = totalPending || fines
    .filter(f => f.status === 'pending')
    .reduce((sum, fine) => sum + fine.amount, 0);
  const activeLoansCount = loans.filter(l => l.status === 'active').length;
  const activeHoldsCount = holds.filter(h => h.status === 'pending' || h.status === 'available').length;
  const overdueLoansCount = loans.filter(l => {
    const days = getDaysRemaining(l.due_date);
    return days < 0 && l.status === 'active';
  }).length;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50">
        {/* Navigation Bar */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-8">
                <Link href="/" className="text-xl font-bold text-gray-900">
                  ULMS
                </Link>
                <Link
                  href="/catalog"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Catalog
                </Link>
                <Link
                  href="/dashboard"
                  className="text-primary-600 border-b-2 border-primary-600 px-3 py-2 text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
                >
                  Profile
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.displayName}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Dashboard</h1>
            <p className="text-gray-600">Manage your loans, holds, and library activity</p>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
              <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Active Loans</p>
                  <p className="text-3xl font-bold text-gray-900">{activeLoansCount}</p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Active Holds</p>
                  <p className="text-3xl font-bold text-gray-900">{activeHoldsCount}</p>
                </div>
                <div className="bg-purple-100 rounded-full p-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Overdue Items</p>
                  <p className="text-3xl font-bold text-red-600">{overdueLoansCount}</p>
                </div>
                <div className="bg-red-100 rounded-full p-3">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Fines</p>
                  <p className="text-3xl font-bold text-gray-900">{totalFines.toFixed(2)} EGP</p>
                </div>
                <div className="bg-yellow-100 rounded-full p-3">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Active Loans Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Current Loans
                </h2>
                <div className="text-xs text-gray-600 bg-blue-100 px-3 py-1 rounded-full">
                  Return books at the library
                </div>
              </div>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                  <p className="mt-4 text-gray-600">Loading your loans...</p>
                </div>
              ) : loans.filter(l => l.status === 'active').length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No active loans</h3>
                  <p className="mt-2 text-gray-500">Browse the catalog to borrow books</p>
                  <Link
                    href="/catalog"
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors"
                  >
                    View Catalog
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {loans
                    .filter(l => l.status === 'active')
                    .map((loan) => {
                      const daysRemaining = getDaysRemaining(loan.due_date);
                      const statusColor = getStatusColor(daysRemaining);
                      const statusText = getStatusText(daysRemaining);

                      return (
                        <div
                          key={loan.id}
                          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all hover:border-gray-300"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-start gap-4">
                                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-3 text-white">
                                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                    {loan.title}
                                  </h3>
                                  <p className="text-sm text-gray-600 mb-3">by {loan.author}</p>

                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <p className="text-gray-500">Checked out</p>
                                      <p className="font-medium text-gray-900">
                                        {new Date(loan.loan_date).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500">Due date</p>
                                      <p className="font-medium text-gray-900">
                                        {new Date(loan.due_date).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                        })}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="mt-3">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusColor}`}>
                                      <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                      </svg>
                                      {statusText}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 ml-4">
                              <button
                                onClick={() => handleRenew(loan.id, loan.title)}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                              >
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Request Renewal
                              </button>
                              <div className="text-xs text-gray-500 text-center px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                                Return books at the library
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Holds Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                My Holds & Reservations
              </h2>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                  <p className="mt-4 text-gray-600">Loading your holds...</p>
                </div>
              ) : holds.filter(h => h.status === 'pending' || h.status === 'available').length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No active holds</h3>
                  <p className="mt-2 text-gray-500">Reserve books that are currently unavailable</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {holds
                    .filter(h => h.status === 'pending' || h.status === 'available')
                    .map((hold) => (
                      <div
                        key={hold.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all hover:border-gray-300"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-start gap-4">
                              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-3 text-white">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                  {hold.title || hold.book_title}
                                </h3>
                                <p className="text-sm text-gray-600 mb-3">by {hold.author || hold.book_author}</p>

                                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                  <div>
                                    <p className="text-gray-500">Placed on</p>
                                    <p className="font-medium text-gray-900">
                                      {new Date(hold.hold_date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                    </p>
                                  </div>
                                  {hold.queue_position && (
                                    <div>
                                      <p className="text-gray-500">Queue Position</p>
                                      <p className="font-medium text-gray-900">
                                        Position {hold.queue_position} of {hold.total_queue || hold.queue_position}
                                      </p>
                                    </div>
                                  )}
                                </div>

                                {/* Countdown Timer */}
                                {hold.expiry_datetime && (hold.status === 'pending' || hold.status === 'available') && (
                                  <div className="mb-3">
                                    <p className="text-sm text-gray-500 mb-1">Time remaining to pick up:</p>
                                    <HoldCountdown expiryDatetime={hold.expiry_datetime} />
                                  </div>
                                )}

                                {hold.status === 'available' ? (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-200">
                                    <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Ready for pickup!
                                  </span>
                                ) : hold.status === 'expired' ? (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                                    <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    Expired {hold.fee_applied && `- Fee: ${hold.fee_amount} EGP`}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                                    <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                    Waiting
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="ml-4">
                            <button
                              onClick={() => handleCancelHold(hold.id)}
                              className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-lg text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                            >
                              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Cancel Hold
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Fines Section */}
          {fines.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center">
                    <svg className="w-6 h-6 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Fines & Payments
                  </h2>
                  {totalFines > 0 && (
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Total Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">{totalFines.toFixed(2)} EGP</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-6">
                {fines.filter(f => f.status === 'pending').length > 0 && (
                  <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Outstanding Balance</p>
                        <p className="text-2xl font-bold text-yellow-900 mt-1">{totalFines.toFixed(2)} EGP</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          {fines.filter(f => f.status === 'pending').length} unpaid fine(s)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {fines.map((fine) => (
                    <div
                      key={fine.id}
                      className={`border rounded-lg p-4 ${
                        fine.status === 'pending'
                          ? 'border-yellow-200 bg-yellow-50'
                          : fine.status === 'paid'
                          ? 'border-green-200 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className={`rounded-lg p-2 ${
                              fine.status === 'pending'
                                ? 'bg-yellow-100'
                                : fine.status === 'paid'
                                ? 'bg-green-100'
                                : 'bg-gray-100'
                            }`}>
                              <svg className={`w-5 h-5 ${
                                fine.status === 'pending'
                                  ? 'text-yellow-600'
                                  : fine.status === 'paid'
                                  ? 'text-green-600'
                                  : 'text-gray-600'
                              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900">
                                  {fine.book_title || 'Fine'}
                                </h3>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  fine.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : fine.status === 'paid'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {fine.status === 'pending' ? 'Pending' : fine.status === 'paid' ? 'Paid' : 'Waived'}
                                </span>
                              </div>
                              {fine.book_author && (
                                <p className="text-sm text-gray-600 mb-2">by {fine.book_author}</p>
                              )}
                              <p className="text-sm text-gray-700 mb-2">{fine.description || `${fine.type} fine`}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>Amount: <strong className="text-gray-900">{fine.amount.toFixed(2)} EGP</strong></span>
                                <span>Type: {fine.type.replace('_', ' ')}</span>
                                {fine.paid_at && (
                                  <span>Paid: {new Date(fine.paid_at).toLocaleDateString()}</span>
                                )}
                                {!fine.paid_at && (
                                  <span>Created: {new Date(fine.created_at).toLocaleDateString()}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        {fine.status === 'pending' && (
                          <button
                            onClick={() => handlePayFine(fine.id)}
                            disabled={payingFineId === fine.id}
                            className="ml-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {payingFineId === fine.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Processing...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                </svg>
                                Pay
                              </>
                            )}
                          </button>
                        )}
                        {fine.status === 'paid' && (
                          <div className="ml-4 flex items-center text-green-600">
                            <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium">Paid</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {fines.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No fines found</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
