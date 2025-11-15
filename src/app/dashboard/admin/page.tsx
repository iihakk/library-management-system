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
  const [activeTab, setActiveTab] = useState<'books' | 'staff'>('books');
  const [books, setBooks] = useState<Book[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
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
    total_copies: '1'
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

  // Fetch staff (we'll need to create this endpoint)
  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      // For now, we'll fetch all users and filter staff
      // In production, create a dedicated endpoint
      const response = await fetch(`${API_BASE_URL}/books`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // This is a placeholder - we'll implement proper staff listing later
      setStaff([]);
    } catch (err: any) {
      console.error('Error fetching staff:', err);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      setLoading(true);
      Promise.all([fetchBooks(), fetchStaff()]).finally(() => setLoading(false));
    }
  }, [user]);

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
          total_copies: parseInt(bookForm.total_copies) || 1
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
          available_copies: editingBook.available_copies
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
      total_copies: book.total_copies.toString()
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
      total_copies: '1'
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
                onClick={() => setActiveTab('books')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'books'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Books Management
              </button>
              <button
                onClick={() => setActiveTab('staff')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'staff'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Staff Management
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

              {/* Staff List */}
              <div className="bg-white shadow rounded-lg p-6">
                <p className="text-gray-500">Staff management functionality will be expanded here.</p>
                <p className="text-sm text-gray-400 mt-2">You can add new staff members using the form above.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}

