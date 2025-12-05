'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';

const API_BASE_URL = 'http://localhost:5000/api';

interface Book {
  id: number;
  isbn?: string;
  title: string;
  author: string;
  publisher?: string;
  publication_year?: number;
  category?: string;
  description?: string;
  book_type?: 'physical' | 'electronic' | 'both';
  total_copies: number;
  available_copies: number;
}

interface Staff {
  uid: string;
  email: string;
  displayName: string;
  role: string;
}

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'books' | 'users' | 'staff' | 'history' | 'reviews'>('books');
  const [adminHistory, setAdminHistory] = useState<any | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userHistory, setUserHistory] = useState<any | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
  const [staffHistory, setStaffHistory] = useState<any | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  
  // Book form state
  const [showBookForm, setShowBookForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [bookForm, setBookForm] = useState({
    isbn: '',
    title: '',
    author: '',
    publisher: '',
    publication_year: '',
    category: '',
    description: '',
    book_type: 'physical',
    total_copies: '1',
    download_link: ''
  });

  // Staff form state
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffForm, setStaffForm] = useState({
    email: '',
    password: '',
    name: ''
  });

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Fetch books
  const fetchBooks = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/books?limit=1000`);
      if (response.ok) {
        const data = await response.json();
        setBooks(data.books || []);
      }
    } catch (err: any) {
      console.error('Error fetching books:', err);
    }
  };

  // Fetch staff
  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/admin/staff`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStaff(data.staff || []);
      }
    } catch (err: any) {
      console.error('Error fetching staff:', err);
    }
  };

  // Fetch admin history
  const fetchAdminHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('No authentication token found. Please log in again.');
        setLoading(false);
        return;
      }
      
      console.log('Fetching admin history from:', `${API_BASE_URL}/admin/history`);
      const response = await fetch(`${API_BASE_URL}/admin/history`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Admin history data:', data);
        setAdminHistory(data);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error response:', errorData);
        setError(errorData.error || `Failed to fetch admin history (Status: ${response.status})`);
        setAdminHistory(null);
      }
    } catch (err: any) {
      console.error('Fetch admin history error:', err);
      setError(err.message || 'Failed to fetch admin history');
      setAdminHistory(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      let url = `${API_BASE_URL}/auth/users?limit=100`;
      if (userSearch) {
        url += `&search=${encodeURIComponent(userSearch)}`;
      }
      if (userRoleFilter) {
        url += `&role=${encodeURIComponent(userRoleFilter)}`;
      }
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
    }
  };

  // Fetch user history
  const fetchUserHistory = async (userId: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserHistory(data);
      } else {
        setError('Failed to fetch user history');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch user history');
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      setLoading(true);
      Promise.all([fetchBooks(), fetchStaff(), fetchUsers()]).finally(() => setLoading(false));
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [userSearch, userRoleFilter, activeTab]);

  useEffect(() => {
    if (selectedUser) {
      fetchUserHistory(selectedUser.id);
    }
  }, [selectedUser]);

  // Fetch staff history
  const fetchStaffHistory = async (staffId: number) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/admin/staff/${staffId}/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStaffHistory(data);
      } else {
        setError('Failed to fetch staff history');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch staff history');
    }
  };

  useEffect(() => {
    if (selectedStaff) {
      fetchStaffHistory(selectedStaff.id);
    }
  }, [selectedStaff]);

  // Fetch admin history when history tab is active
  useEffect(() => {
    if (activeTab === 'history') {
      fetchAdminHistory();
    }
  }, [activeTab]);

  // Generate PDF report
  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/admin/reports/generate`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Get the blob
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        a.download = `library-report-${timestamp}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        setSuccessMessage('Report generated and downloaded successfully!');
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate report');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate report. Make sure Python 3 and LaTeX are installed.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setGeneratingReport(false);
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

  // Book CRUD operations
  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isbn: bookForm.isbn || null,
          title: bookForm.title,
          author: bookForm.author,
          publisher: bookForm.publisher || null,
          publication_year: bookForm.publication_year ? parseInt(bookForm.publication_year) : null,
          category: bookForm.category || null,
          description: bookForm.description || null,
          book_type: bookForm.book_type,
          total_copies: parseInt(bookForm.total_copies) || 1,
          download_link: (bookForm.book_type === 'electronic' || bookForm.book_type === 'both') ? (bookForm.download_link || null) : null
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Book created successfully!');
        setShowBookForm(false);
        resetBookForm();
        fetchBooks();
      } else {
        setError(data.error || 'Failed to create book');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create book');
    }
  };

  const handleUpdateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;

    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/books/${editingBook.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          isbn: bookForm.isbn || null,
          title: bookForm.title,
          author: bookForm.author,
          publisher: bookForm.publisher || null,
          publication_year: bookForm.publication_year ? parseInt(bookForm.publication_year) : null,
          category: bookForm.category || null,
          description: bookForm.description || null,
          book_type: bookForm.book_type,
          total_copies: parseInt(bookForm.total_copies) || 1,
          available_copies: editingBook.available_copies,
          download_link: (bookForm.book_type === 'electronic' || bookForm.book_type === 'both') ? (bookForm.download_link || null) : null
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Book updated successfully!');
        setShowBookForm(false);
        setEditingBook(null);
        resetBookForm();
        fetchBooks();
      } else {
        setError(data.error || 'Failed to update book');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update book');
    }
  };

  const handleDeleteBook = async (id: number) => {
    if (!confirm('Are you sure you want to delete this book?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/books/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setSuccessMessage('Book deleted successfully!');
        fetchBooks();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete book');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete book');
    }
  };

  const handleEditBook = (book: Book) => {
    setEditingBook(book);
    setBookForm({
      isbn: book.isbn || '',
      title: book.title,
      author: book.author,
      publisher: book.publisher || '',
      publication_year: book.publication_year?.toString() || '',
      category: book.category || '',
      description: book.description || '',
      book_type: (book as any).book_type || 'physical',
      total_copies: book.total_copies.toString(),
      download_link: (book as any).download_link || ''
    });
    setShowBookForm(true);
  };

  const resetBookForm = () => {
    setBookForm({
      isbn: '',
      title: '',
      author: '',
      publisher: '',
      publication_year: '',
      category: '',
      description: '',
      book_type: 'physical',
      total_copies: '1',
      download_link: ''
    });
    setEditingBook(null);
  };

  // Staff operations
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/auth/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(staffForm)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Staff member created successfully!');
        setShowStaffForm(false);
        setStaffForm({ email: '', password: '', name: '' });
        fetchStaff();
      } else {
        setError(data.error || 'Failed to create staff member');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create staff member');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

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
                <Link href="/dashboard/admin" className="text-primary-600 border-b-2 border-primary-600 px-3 py-2 text-sm font-medium">
                  Admin Dashboard
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
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage books and staff members</p>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
              {successMessage}
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => {
                  setActiveTab('books');
                  setSelectedUser(null);
                  setUserHistory(null);
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'books'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Books Management
              </button>
              <button
                onClick={() => {
                  setActiveTab('users');
                  setSelectedUser(null);
                  setUserHistory(null);
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Users & History
              </button>
              <button
                onClick={() => {
                  setActiveTab('staff');
                  setSelectedUser(null);
                  setUserHistory(null);
                  setSelectedStaff(null);
                  setStaffHistory(null);
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'staff'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Staff Management
              </button>
              <button
                onClick={() => {
                  setActiveTab('history');
                  fetchAdminHistory();
                }}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My History
              </button>
            </nav>
          </div>

          {/* Books Tab */}
          {activeTab === 'books' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">Books</h2>
                <button
                  onClick={() => {
                    resetBookForm();
                    setShowBookForm(true);
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Add New Book
                </button>
              </div>

              {/* Book Form Modal */}
              {showBookForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <h3 className="text-xl font-bold mb-4">
                      {editingBook ? 'Edit Book' : 'Add New Book'}
                    </h3>
                    <form onSubmit={editingBook ? handleUpdateBook : handleCreateBook} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
                          <input
                            type="text"
                            value={bookForm.isbn}
                            onChange={(e) => setBookForm({ ...bookForm, isbn: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                          <input
                            type="text"
                            required
                            value={bookForm.title}
                            onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Author *</label>
                          <input
                            type="text"
                            required
                            value={bookForm.author}
                            onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Publisher</label>
                          <input
                            type="text"
                            value={bookForm.publisher}
                            onChange={(e) => setBookForm({ ...bookForm, publisher: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Publication Year</label>
                          <input
                            type="number"
                            value={bookForm.publication_year}
                            onChange={(e) => setBookForm({ ...bookForm, publication_year: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                          <input
                            type="text"
                            value={bookForm.category}
                            onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Book Type *</label>
                          <select
                            value={bookForm.book_type}
                            onChange={(e) => setBookForm({ ...bookForm, book_type: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            required
                          >
                            <option value="physical">Physical</option>
                            <option value="electronic">Electronic</option>
                            <option value="both">Both</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Total Copies *</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={bookForm.total_copies}
                            onChange={(e) => setBookForm({ ...bookForm, total_copies: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                          <textarea
                            value={bookForm.description}
                            onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                            rows={4}
                            placeholder="Optional"
                          />
                        </div>
                        {(bookForm.book_type === 'electronic' || bookForm.book_type === 'both') && (
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Download/Access Link</label>
                            <input
                              type="url"
                              value={bookForm.download_link}
                              onChange={(e) => setBookForm({ ...bookForm, download_link: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              placeholder="https://example.com/book.pdf"
                            />
                            <p className="text-xs text-gray-500 mt-1">Link to access or download the electronic book</p>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end space-x-3 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setShowBookForm(false);
                            resetBookForm();
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                          {editingBook ? 'Update Book' : 'Create Book'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Books Table */}
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ISBN</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Copies</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {books.map((book) => (
                      <tr key={book.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {book.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{book.author}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{book.isbn || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            (book as any).book_type === 'electronic' ? 'bg-blue-100 text-blue-800' :
                            (book as any).book_type === 'both' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {(book as any).book_type || 'physical'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{book.total_copies}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{book.available_copies}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditBook(book)}
                            className="text-primary-600 hover:text-primary-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteBook(book.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {books.length === 0 && (
                  <div className="text-center py-8 text-gray-500">No books found</div>
                )}
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              {!selectedUser ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900">All Users</h2>
                  </div>

                  {/* Search and Filter */}
                  <div className="bg-white shadow rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Search Users</label>
                        <input
                          type="text"
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          placeholder="Search by email, name, or ID..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Role</label>
                        <select
                          value={userRoleFilter}
                          onChange={(e) => setUserRoleFilter(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">All Roles</option>
                          <option value="user">User</option>
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Users Table */}
                  <div className="bg-white shadow rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {u.display_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                u.role === 'staff' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(u.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => setSelectedUser(u)}
                                className="text-primary-600 hover:text-primary-900"
                              >
                                View History
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {users.length === 0 && (
                      <div className="text-center py-8 text-gray-500">No users found</div>
                    )}
                  </div>
                </>
              ) : (
                <div>
                  <div className="mb-6">
                    <button
                      onClick={() => {
                        setSelectedUser(null);
                        setUserHistory(null);
                      }}
                      className="text-primary-600 hover:text-primary-900 mb-4 flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Users List
                    </button>
                    <h2 className="text-2xl font-semibold text-gray-900">
                      User History: {selectedUser.display_name}
                    </h2>
                    <p className="text-gray-600 mt-1">{selectedUser.email}</p>
                  </div>

                  {userHistory ? (
                    <div className="space-y-6">
                      {/* Statistics */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white shadow rounded-lg p-4">
                          <p className="text-sm text-gray-600">Active Loans</p>
                          <p className="text-2xl font-bold text-gray-900">{userHistory.statistics.activeLoans}</p>
                        </div>
                        <div className="bg-white shadow rounded-lg p-4">
                          <p className="text-sm text-gray-600">Total Loans</p>
                          <p className="text-2xl font-bold text-gray-900">{userHistory.statistics.totalLoans}</p>
                        </div>
                        <div className="bg-white shadow rounded-lg p-4">
                          <p className="text-sm text-gray-600">Overdue</p>
                          <p className="text-2xl font-bold text-red-600">{userHistory.statistics.overdueLoans}</p>
                        </div>
                        <div className="bg-white shadow rounded-lg p-4">
                          <p className="text-sm text-gray-600">Total Fines</p>
                          <p className="text-2xl font-bold text-yellow-600">{userHistory.statistics.totalFines} EGP</p>
                        </div>
                      </div>

                      {/* Loans History */}
                      <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900">Loan History</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Book</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loan Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {userHistory.history.loans.map((loan: any) => (
                                <tr key={loan.id}>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{loan.title}</div>
                                    <div className="text-sm text-gray-500">by {loan.author}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(loan.loan_date).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(loan.due_date).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {loan.return_date ? new Date(loan.return_date).toLocaleDateString() : '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      loan.status === 'active' ? 'bg-green-100 text-green-800' :
                                      loan.status === 'returned' ? 'bg-gray-100 text-gray-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {loan.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {userHistory.history.loans.length === 0 && (
                            <div className="text-center py-8 text-gray-500">No loan history</div>
                          )}
                        </div>
                      </div>

                      {/* Holds History */}
                      <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900">Reservations/Holds History</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Book</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hold Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {userHistory.history.holds.map((hold: any) => (
                                <tr key={hold.id}>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{hold.title}</div>
                                    <div className="text-sm text-gray-500">by {hold.author}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(hold.hold_date).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {hold.expiry_datetime ? new Date(hold.expiry_datetime).toLocaleDateString() : '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    {(() => {
                                      // Determine display status
                                      let displayStatus = '';
                                      let statusClass = '';
                                      
                                      if (hold.fulfillment_status === 'fulfilled') {
                                        displayStatus = 'Reserved and Got';
                                        statusClass = 'bg-green-100 text-green-800';
                                      } else if (hold.status === 'cancelled') {
                                        displayStatus = 'Reserved then Cancelled';
                                        statusClass = 'bg-gray-100 text-gray-800';
                                      } else if (hold.status === 'pending' || hold.status === 'available') {
                                        displayStatus = 'Reserved Now';
                                        statusClass = 'bg-yellow-100 text-yellow-800';
                                      } else {
                                        displayStatus = hold.status;
                                        statusClass = 'bg-red-100 text-red-800';
                                      }
                                      
                                      return (
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                                          {displayStatus}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {userHistory.history.holds.length === 0 && (
                            <div className="text-center py-8 text-gray-500">No reservation history</div>
                          )}
                        </div>
                      </div>

                      {/* Fines History */}
                      {userHistory.history.fines.length > 0 && (
                        <div className="bg-white shadow rounded-lg overflow-hidden">
                          <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900">Fines History</h3>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Book</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {userHistory.history.fines.map((fine: any) => (
                                  <tr key={fine.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                      {fine.amount} EGP
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fine.type}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {fine.book_title || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {new Date(fine.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        fine.status === 'paid' ? 'bg-green-100 text-green-800' :
                                        fine.status === 'waived' ? 'bg-blue-100 text-blue-800' :
                                        'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {fine.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                      <p className="mt-4 text-gray-600">Loading user history...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Staff Tab */}
          {activeTab === 'staff' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">Staff Members</h2>
                <button
                  onClick={() => setShowStaffForm(true)}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Add New Staff
                </button>
              </div>

              {/* Staff Form Modal */}
              {showStaffForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-md w-full">
                    <h3 className="text-xl font-bold mb-4">Add New Staff Member</h3>
                    <form onSubmit={handleCreateStaff} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input
                          type="text"
                          required
                          value={staffForm.name}
                          onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input
                          type="email"
                          required
                          value={staffForm.email}
                          onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                        <input
                          type="password"
                          required
                          value={staffForm.password}
                          onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="flex justify-end space-x-3 pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setShowStaffForm(false);
                            setStaffForm({ email: '', password: '', name: '' });
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                          Create Staff
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {!selectedStaff ? (
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {staff.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {s.display_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{s.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              s.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {s.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(s.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => setSelectedStaff(s)}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              View History
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {staff.length === 0 && (
                    <div className="text-center py-8 text-gray-500">No staff members found</div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="mb-6">
                    <button
                      onClick={() => {
                        setSelectedStaff(null);
                        setStaffHistory(null);
                      }}
                      className="text-primary-600 hover:text-primary-900 mb-4 flex items-center"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to Staff List
                    </button>
                    <h2 className="text-2xl font-semibold text-gray-900">
                      Staff History: {selectedStaff.display_name}
                    </h2>
                    <p className="text-gray-600 mt-1">{selectedStaff.email}</p>
                  </div>

                  {staffHistory ? (
                    <div className="space-y-6">
                      {/* Statistics */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white shadow rounded-lg p-4">
                          <p className="text-sm text-gray-600">Total Assigned</p>
                          <p className="text-2xl font-bold text-gray-900">{staffHistory.statistics.totalAssigned}</p>
                        </div>
                        <div className="bg-white shadow rounded-lg p-4">
                          <p className="text-sm text-gray-600">Total Returned</p>
                          <p className="text-2xl font-bold text-gray-900">{staffHistory.statistics.totalReturned}</p>
                        </div>
                        <div className="bg-white shadow rounded-lg p-4">
                          <p className="text-sm text-gray-600">Active Assigned</p>
                          <p className="text-2xl font-bold text-blue-600">{staffHistory.statistics.activeAssigned}</p>
                        </div>
                      </div>

                      {/* Books Assigned */}
                      <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900">Books Assigned</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Book</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loan Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {staffHistory.history.assigned.map((loan: any) => (
                                <tr key={loan.id}>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{loan.title}</div>
                                    <div className="text-sm text-gray-500">by {loan.author}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{loan.user_name}</div>
                                    <div className="text-sm text-gray-500">{loan.user_email}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(loan.loan_date).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(loan.due_date).toLocaleDateString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      loan.status === 'active' ? 'bg-green-100 text-green-800' :
                                      loan.status === 'returned' ? 'bg-gray-100 text-gray-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {loan.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {staffHistory.history.assigned.length === 0 && (
                            <div className="text-center py-8 text-gray-500">No books assigned</div>
                          )}
                        </div>
                      </div>

                      {/* Books Returned */}
                      <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-900">Books Returned</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Book</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Returned By</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Condition</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {staffHistory.history.returned.map((loan: any) => (
                                <tr key={loan.id}>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{loan.title}</div>
                                    <div className="text-sm text-gray-500">by {loan.author}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{loan.user_name}</div>
                                    <div className="text-sm text-gray-500">{loan.user_email}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {loan.return_date ? new Date(loan.return_date).toLocaleDateString() : '-'}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {loan.return_condition ? (
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        loan.return_condition === 'excellent' ? 'bg-green-100 text-green-800' :
                                        loan.return_condition === 'good' ? 'bg-blue-100 text-blue-800' :
                                        loan.return_condition === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                                        loan.return_condition === 'poor' ? 'bg-orange-100 text-orange-800' :
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        {loan.return_condition}
                                      </span>
                                    ) : '-'}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-500">
                                    {loan.return_notes || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {staffHistory.history.returned.length === 0 && (
                            <div className="text-center py-8 text-gray-500">No books returned</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                      <p className="mt-4 text-gray-600">Loading staff history...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Admin History Tab */}
          {activeTab === 'history' && (
            <div>
              <div className="mb-6 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900">My Admin History</h2>
                  <p className="mt-1 text-sm text-gray-600">Books you've added/edited and users you've edited</p>
                </div>
                <button
                  onClick={handleGenerateReport}
                  disabled={generatingReport}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {generatingReport ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Generate PDF Report
                    </>
                  )}
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                  <p className="mt-4 text-gray-600">Loading history...</p>
                </div>
              ) : adminHistory ? (
                <div className="space-y-6">
                  {/* Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg shadow p-6">
                      <p className="text-sm font-medium text-gray-600">Books Created</p>
                      <p className="text-2xl font-bold text-gray-900">{adminHistory.statistics.booksCreated}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                      <p className="text-sm font-medium text-gray-600">Books Updated</p>
                      <p className="text-2xl font-bold text-gray-900">{adminHistory.statistics.booksUpdated}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                      <p className="text-sm font-medium text-gray-600">Books Deleted</p>
                      <p className="text-2xl font-bold text-gray-900">{adminHistory.statistics.booksDeleted}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                      <p className="text-sm font-medium text-gray-600">Total Actions</p>
                      <p className="text-2xl font-bold text-gray-900">{adminHistory.statistics.totalActions}</p>
                    </div>
                  </div>

                  {/* Book Actions */}
                  {adminHistory.history.bookActions.length > 0 && (
                    <div className="bg-white rounded-lg shadow">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Book Actions</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Book</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {adminHistory.history.bookActions.map((action: any) => (
                              <tr key={action.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(action.created_at).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    action.action_type === 'book_created' ? 'bg-green-100 text-green-800' :
                                    action.action_type === 'book_updated' ? 'bg-blue-100 text-blue-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {action.action_type === 'book_created' ? 'Created' :
                                     action.action_type === 'book_updated' ? 'Updated' :
                                     'Deleted'}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  {action.book_title ? (
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">{action.book_title}</div>
                                      {action.book_author && (
                                        <div className="text-sm text-gray-500">by {action.book_author}</div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-sm text-gray-500">Book ID: {action.entity_id}</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                  {action.description || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* User Actions */}
                  {adminHistory.history.userActions.length > 0 && (
                    <div className="bg-white rounded-lg shadow">
                      <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">User Actions</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {adminHistory.history.userActions.map((action: any) => (
                              <tr key={action.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(action.created_at).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    {action.action_type === 'user_updated' ? 'Updated' :
                                     action.action_type === 'user_role_changed' ? 'Role Changed' :
                                     action.action_type === 'user_status_changed' ? 'Status Changed' :
                                     'Modified'}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  {action.user_name ? (
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">{action.user_name}</div>
                                      <div className="text-sm text-gray-500">{action.user_email}</div>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-gray-500">User ID: {action.entity_id}</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                  {action.description || '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {adminHistory.history.bookActions.length === 0 && adminHistory.history.userActions.length === 0 && (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                      <p className="text-gray-500">No actions recorded yet</p>
                      <p className="text-sm text-gray-400 mt-2">Your book and user management actions will appear here</p>
                    </div>
                  )}
                </div>
              ) : error ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <p className="text-red-600 font-medium mb-2">Failed to load history</p>
                  <p className="text-sm text-gray-500 mb-4">{error}</p>
                  <button
                    onClick={fetchAdminHistory}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <p className="text-gray-500">No history data available</p>
                </div>
              )}
            </div>
          )}

          {/* Reviews Moderation Tab */}
          {activeTab === 'reviews' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Moderation</h2>
                <p className="text-gray-600">Approve or reject user-submitted book reviews</p>
              </div>

              {reviewLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                  <p className="mt-4 text-gray-600">Loading pending reviews...</p>
                </div>
              ) : pendingReviews.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-4 text-gray-500">No pending reviews</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingReviews.map((review) => (
                    <div key={review.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-primary-600 font-semibold">
                                {review.user_name?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{review.user_name}</p>
                              <p className="text-sm text-gray-500">{review.user_email}</p>
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700 mb-1">Book:</p>
                            <p className="text-lg font-semibold text-gray-900">{review.book_title}</p>
                            <p className="text-sm text-gray-600">by {review.book_author}</p>
                          </div>

                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-sm font-medium text-gray-700">Rating:</span>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={`w-5 h-5 ${
                                    star <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                  }`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-sm text-gray-600">({review.rating}/5)</span>
                          </div>

                          {review.review_text && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-gray-700 mb-1">Review:</p>
                              <p className="text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                                {review.review_text}
                              </p>
                            </div>
                          )}

                          <p className="text-xs text-gray-500">
                            Submitted: {new Date(review.created_at).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <button
                            onClick={() => handleApproveReview(review.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectReview(review.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

