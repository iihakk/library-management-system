'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE_URL = 'http://localhost:5001/api';

interface Book {
  id: number;
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  publication_year?: number;
  category?: string;
  description?: string;
  total_copies: number;
  available_copies: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function CatalogPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });
  const { user } = useAuth();

  const fetchBooks = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (selectedCategory) {
        params.append('category', selectedCategory);
      }
      if (selectedAuthor) {
        params.append('author', selectedAuthor);
      }

      const response = await fetch(`${API_BASE_URL}/books?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch books');
      }

      setBooks(data.books || []);
      setPagination(data.pagination || pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load books');
      console.error('Error fetching books:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [pagination.page, selectedCategory, selectedAuthor]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchBooks();
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleAuthorChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSelectedAuthor(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedAuthor('');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const getCategories = () => {
    const categories = new Set<string>();
    books.forEach((book) => {
      if (book.category) {
        categories.add(book.category);
      }
    });
    return Array.from(categories).sort();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold text-gray-900">
                ULMS
              </Link>
              <Link
                href="/catalog"
                className="text-primary-600 border-b-2 border-primary-600 px-3 py-2 text-sm font-medium"
              >
                Catalog
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <span className="text-gray-700">
                    Welcome, <strong>{user.displayName || user.email}</strong>
                  </span>
                  <Link
                    href="/dashboard"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Library Catalog</h1>
          <p className="text-gray-600">Browse and search our collection of books</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search by title, author, or ISBN..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={handleCategoryChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">All Categories</option>
                {getCategories().map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Author Filter */}
            <div>
              <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-2">
                Author
              </label>
              <input
                type="text"
                id="author"
                value={selectedAuthor}
                onChange={handleAuthorChange}
                placeholder="Filter by author..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || selectedCategory || selectedAuthor) && (
            <div className="mt-4">
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Loading books...</p>
          </div>
        )}

        {/* Books Grid */}
        {!loading && !error && (
          <>
            {books.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No books found</h3>
                <p className="mt-2 text-gray-500">
                  {searchTerm || selectedCategory || selectedAuthor
                    ? 'Try adjusting your search or filters'
                    : 'The catalog is empty'}
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  Showing {books.length} of {pagination.total} books
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {books.map((book) => (
                    <div
                      key={book.id}
                      className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                              {book.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">by {book.author}</p>
                          </div>
                        </div>

                        {book.category && (
                          <span className="inline-block px-2 py-1 text-xs font-medium text-primary-700 bg-primary-100 rounded mb-3">
                            {book.category}
                          </span>
                        )}

                        {book.description && (
                          <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                            {book.description}
                          </p>
                        )}

                        <div className="space-y-2 text-sm">
                          {book.publication_year && (
                            <p className="text-gray-600">
                              <span className="font-medium">Year:</span> {book.publication_year}
                            </p>
                          )}
                          {book.publisher && (
                            <p className="text-gray-600">
                              <span className="font-medium">Publisher:</span> {book.publisher}
                            </p>
                          )}
                          {book.isbn && (
                            <p className="text-gray-600">
                              <span className="font-medium">ISBN:</span> {book.isbn}
                            </p>
                          )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium text-gray-900">
                                  {book.available_copies}
                                </span>{' '}
                                of {book.total_copies} available
                              </p>
                            </div>
                            {book.available_copies > 0 ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Available
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Unavailable
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Page {pagination.page} of {pagination.totalPages}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() =>
                          setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                        }
                        disabled={pagination.page === 1}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() =>
                          setPagination((prev) => ({
                            ...prev,
                            page: Math.min(pagination.totalPages, prev.page + 1),
                          }))
                        }
                        disabled={pagination.page === pagination.totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

