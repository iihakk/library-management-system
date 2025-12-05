'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

const API_BASE_URL = 'http://localhost:5000/api';

interface User {
  id: number;
  email: string;
  display_name: string;
  role: string;
}

interface Book {
  id: number;
  title: string;
  author: string;
  isbn?: string;
  available_copies: number;
}

interface Loan {
  id: number;
  user_id: number;
  book_id: number;
  title: string;
  author: string;
  isbn?: string;
  user_name: string;
  email: string;
  loan_date: string;
  due_date: string;
  return_date?: string;
  status: string;
  return_condition?: string;
  return_notes?: string;
}

export default function StaffDashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'assign' | 'return'>('assign');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Assign book state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ users: User[]; books: Book[] }>({ users: [], books: [] });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [loanPeriod, setLoanPeriod] = useState(14);

  // Return book state
  const [returnUserSearchQuery, setReturnUserSearchQuery] = useState('');
  const [returnUserSearchResults, setReturnUserSearchResults] = useState<User[]>([]);
  const [selectedReturnUser, setSelectedReturnUser] = useState<User | null>(null);
  const [userActiveLoans, setUserActiveLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [returnCondition, setReturnCondition] = useState<'excellent' | 'good' | 'fair' | 'poor' | 'damaged'>('good');
  const [returnNotes, setReturnNotes] = useState('');

  // Redirect if not staff
  useEffect(() => {
    if (user && user.role !== 'staff' && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Search users for return tab
  const searchUsersForReturn = async (query: string) => {
    if (query.length < 2) {
      setReturnUserSearchResults([]);
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/staff/users/search?query=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReturnUserSearchResults(data.users || []);
      }
    } catch (err) {
      console.error('Search users error:', err);
    }
  };

  // Handle return user search input
  useEffect(() => {
    if (activeTab === 'return' && returnUserSearchQuery) {
      const timeoutId = setTimeout(() => {
        searchUsersForReturn(returnUserSearchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setReturnUserSearchResults([]);
    }
  }, [returnUserSearchQuery, activeTab]);

  // Fetch user's active loans when user is selected
  const fetchUserActiveLoans = async (userId: number) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/staff/loans?status=active`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        // Filter loans for the selected user
        const userLoans = (data.loans || []).filter((loan: Loan) => loan.user_id === userId);
        setUserActiveLoans(userLoans);
      } else {
        throw new Error('Failed to fetch loans');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load user loans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedReturnUser) {
      fetchUserActiveLoans(selectedReturnUser.id);
    } else {
      setUserActiveLoans([]);
      setSelectedLoan(null);
    }
  }, [selectedReturnUser]);


  // Search users
  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults(prev => ({ ...prev, users: [] }));
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/staff/users/search?query=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(prev => ({ ...prev, users: data.users || [] }));
      }
    } catch (err) {
      console.error('Search users error:', err);
    }
  };

  // Search books
  const searchBooks = async (query: string) => {
    if (query.length < 2) {
      setSearchResults(prev => ({ ...prev, books: [] }));
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/books?search=${encodeURIComponent(query)}&limit=10`);

      if (response.ok) {
        const data = await response.json();
        setSearchResults(prev => ({ ...prev, books: data.books || [] }));
      }
    } catch (err) {
      console.error('Search books error:', err);
    }
  };

  // Handle user search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (userSearchQuery) {
        searchUsers(userSearchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [userSearchQuery]);

  // Handle book search input
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (bookSearchQuery) {
        searchBooks(bookSearchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [bookSearchQuery]);

  // Assign book to user
  const handleAssignBook = async () => {
    if (!selectedUser || !selectedBook) {
      setError('Please select both a user and a book');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/staff/loans/assign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
          book_id: selectedBook.id,
          loan_period_days: loanPeriod
        })
      });

      if (response.ok) {
        setSuccessMessage(`Book "${selectedBook.title}" successfully assigned to ${selectedUser.display_name}`);
        setSelectedUser(null);
        setSelectedBook(null);
        setUserSearchQuery('');
        setBookSearchQuery('');
        setSearchResults({ users: [], books: [] });
        setLoanPeriod(14);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to assign book');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to assign book');
    } finally {
      setLoading(false);
    }
  };

  // Process return
  const handleProcessReturn = async () => {
    if (!selectedLoan) {
      setError('Please select a loan to return');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/staff/loans/${selectedLoan.id}/return`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          return_condition: returnCondition,
          return_notes: returnNotes || null
        })
      });

      if (response.ok) {
        const data = await response.json();
        let message = `Book "${selectedLoan.title}" returned successfully.`;
        if (data.fine_incurred) {
          message += ` Fine: ${data.fine_amount.toFixed(2)} EGP (${data.days_overdue} days overdue).`;
        }
        if (data.hold_assigned) {
          message += ' Book assigned to next hold in queue.';
        }
        setSuccessMessage(message);
        setSelectedLoan(null);
        setReturnCondition('good');
        setReturnNotes('');
        // Refresh user's loans
        if (selectedReturnUser) {
          fetchUserActiveLoans(selectedReturnUser.id);
        }
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to process return');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process return');
    } finally {
      setLoading(false);
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

  // Calculate days remaining/overdue
  const getDaysStatus = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => {
                  setActiveTab('assign');
                  setError('');
                  setSuccessMessage('');
                }}
                className={`flex-1 px-6 py-4 text-sm font-medium text-center border-b-2 transition-colors ${
                  activeTab === 'assign'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Assign Book
              </button>
              <button
                onClick={() => {
                  setActiveTab('return');
                  setError('');
                  setSuccessMessage('');
                }}
                className={`flex-1 px-6 py-4 text-sm font-medium text-center border-b-2 transition-colors ${
                  activeTab === 'return'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Process Return
              </button>
            </div>

            <div className="p-6">
              {/* Assign Book Tab */}
              {activeTab === 'assign' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Assign Book to User</h2>

                  {/* User Search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search User (by email or name)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={userSearchQuery}
                        onChange={(e) => {
                          setUserSearchQuery(e.target.value);
                          setSelectedUser(null);
                        }}
                        placeholder="Type to search users..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      {selectedUser && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm font-medium text-green-900">Selected: {selectedUser.display_name}</p>
                          <p className="text-xs text-green-700">{selectedUser.email}</p>
                        </div>
                      )}
                      {userSearchQuery && !selectedUser && searchResults.users.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {searchResults.users.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => {
                                setSelectedUser(u);
                                setUserSearchQuery(u.email);
                                setSearchResults(prev => ({ ...prev, users: [] }));
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                            >
                              <p className="font-medium text-gray-900">{u.display_name}</p>
                              <p className="text-sm text-gray-600">{u.email}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Book Search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Book (by title, author, or ISBN)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={bookSearchQuery}
                        onChange={(e) => {
                          setBookSearchQuery(e.target.value);
                          setSelectedBook(null);
                        }}
                        placeholder="Type to search books..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      {selectedBook && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm font-medium text-green-900">{selectedBook.title}</p>
                          <p className="text-xs text-green-700">by {selectedBook.author}</p>
                          <p className="text-xs text-green-700">Available copies: {selectedBook.available_copies}</p>
                        </div>
                      )}
                      {bookSearchQuery && !selectedBook && searchResults.books.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {searchResults.books.map((book) => (
                            <button
                              key={book.id}
                              onClick={() => {
                                setSelectedBook(book);
                                setBookSearchQuery(book.title);
                                setSearchResults(prev => ({ ...prev, books: [] }));
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                            >
                              <p className="font-medium text-gray-900">{book.title}</p>
                              <p className="text-sm text-gray-600">by {book.author}</p>
                              <p className="text-xs text-gray-500">Available: {book.available_copies} copies</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Loan Period */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loan Period (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={loanPeriod}
                      onChange={(e) => setLoanPeriod(parseInt(e.target.value) || 14)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  {/* Assign Button */}
                  <button
                    onClick={handleAssignBook}
                    disabled={loading || !selectedUser || !selectedBook}
                    className="w-full px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Processing...' : 'Assign Book'}
                  </button>
                </div>
              )}

              {/* Process Return Tab */}
              {activeTab === 'return' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-gray-900">Process Book Return</h2>

                  {!selectedReturnUser ? (
                    <div>
                      <p className="text-sm text-gray-600 mb-4">Search for a user to see their borrowed books:</p>
                      
                      {/* User Search */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Search User (by email or name)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={returnUserSearchQuery}
                            onChange={(e) => {
                              setReturnUserSearchQuery(e.target.value);
                              setSelectedReturnUser(null);
                            }}
                            placeholder="Type to search users..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                          {returnUserSearchQuery && returnUserSearchResults.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {returnUserSearchResults.map((u) => (
                                <button
                                  key={u.id}
                                  onClick={() => {
                                    setSelectedReturnUser(u);
                                    setReturnUserSearchQuery(u.email);
                                    setReturnUserSearchResults([]);
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                                >
                                  <p className="font-medium text-gray-900">{u.display_name}</p>
                                  <p className="text-sm text-gray-600">{u.email}</p>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : !selectedLoan ? (
                    <div>
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">User: {selectedReturnUser.display_name}</p>
                            <p className="text-sm text-gray-600">{selectedReturnUser.email}</p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedReturnUser(null);
                              setReturnUserSearchQuery('');
                              setUserActiveLoans([]);
                            }}
                            className="text-sm text-primary-600 hover:text-primary-900"
                          >
                            Change User
                          </button>
                        </div>
                      </div>

                      {loading ? (
                        <div className="text-center py-12">
                          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                          <p className="mt-4 text-gray-600">Loading user's loans...</p>
                        </div>
                      ) : userActiveLoans.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                          <p className="text-gray-500">This user has no active loans</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-600 mb-4">Select a book to return:</p>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {userActiveLoans.map((loan) => {
                              const daysStatus = getDaysStatus(loan.due_date);
                              const isOverdue = daysStatus < 0;

                              return (
                                <button
                                  key={loan.id}
                                  onClick={() => setSelectedLoan(loan)}
                                  className={`w-full text-left p-4 border rounded-lg hover:shadow-md transition-all ${
                                    isOverdue
                                      ? 'border-red-300 bg-red-50'
                                      : daysStatus <= 3
                                      ? 'border-yellow-300 bg-yellow-50'
                                      : 'border-gray-200 bg-white'
                                  }`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <h3 className="font-semibold text-gray-900">{loan.title}</h3>
                                      <p className="text-sm text-gray-600">by {loan.author}</p>
                                      <div className="mt-2 flex gap-4 text-xs text-gray-500">
                                        <span>Loan Date: {new Date(loan.loan_date).toLocaleDateString()}</span>
                                        <span>Due: {new Date(loan.due_date).toLocaleDateString()}</span>
                                        {isOverdue ? (
                                          <span className="text-red-600 font-medium">Overdue by {Math.abs(daysStatus)} days</span>
                                        ) : (
                                          <span>{daysStatus} days remaining</span>
                                        )}
                                      </div>
                                    </div>
                                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Selected Loan Info */}
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900">{selectedLoan.title}</h3>
                        <p className="text-sm text-gray-600">by {selectedLoan.author}</p>
                        <p className="text-sm text-gray-600 mt-2">Borrowed by: {selectedLoan.user_name} ({selectedLoan.email})</p>
                        <p className="text-sm text-gray-600">Due date: {new Date(selectedLoan.due_date).toLocaleDateString()}</p>
                        {getDaysStatus(selectedLoan.due_date) < 0 && (
                          <p className="text-sm text-red-600 font-medium mt-1">
                            Overdue by {Math.abs(getDaysStatus(selectedLoan.due_date))} days
                          </p>
                        )}
                      </div>

                      {/* Return Condition */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Book Condition
                        </label>
                        <select
                          value={returnCondition}
                          onChange={(e) => setReturnCondition(e.target.value as any)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="excellent">Excellent</option>
                          <option value="good">Good</option>
                          <option value="fair">Fair</option>
                          <option value="poor">Poor</option>
                          <option value="damaged">Damaged</option>
                        </select>
                      </div>

                      {/* Return Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Notes (optional)
                        </label>
                        <textarea
                          value={returnNotes}
                          onChange={(e) => setReturnNotes(e.target.value)}
                          rows={3}
                          placeholder="Add any notes about the book condition..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                        setSelectedLoan(null);
                        setReturnCondition('good');
                        setReturnNotes('');
                        // Don't reset user - allow returning another book
                      }}
                          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleProcessReturn}
                          disabled={loading}
                          className="flex-1 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {loading ? 'Processing...' : 'Process Return'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
