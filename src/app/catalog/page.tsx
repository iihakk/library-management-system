'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const API_BASE_URL = 'http://localhost:5000/api';

interface Book {
  id: number;
  title: string;
  author: string;
  isbn?: string;
  publisher?: string;
  publication_year?: number;
  category?: string;
  description?: string;
  book_type?: 'physical' | 'electronic' | 'both';
  total_copies: number;
  available_copies: number;
  reserved_count?: number;
  average_rating?: number | null;
  total_reviews?: number;
  download_link?: string;
  user_hold_id?: number | null; // ID of user's active hold on this book
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
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [placingHoldBookId, setPlacingHoldBookId] = useState<number | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    isbn: '',
    publisher: '',
    year: '',
    yearFrom: '',
    yearTo: '',
    bookType: 'all',
    availableOnly: false,
    minRating: ''
  });
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });
  const { user } = useAuth();
  const router = useRouter();

  const fetchBooks = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      // Use advanced search if any advanced filters are set
      const hasAdvancedFilters = advancedFilters.isbn || advancedFilters.publisher || 
                                 advancedFilters.year || advancedFilters.yearFrom || 
                                 advancedFilters.yearTo || advancedFilters.bookType !== 'all' ||
                                 advancedFilters.availableOnly || advancedFilters.minRating;

      if (hasAdvancedFilters || searchTerm) {
        if (searchTerm) {
          params.append('query', searchTerm);
        }
        if (selectedCategory) {
          params.append('category', selectedCategory);
        }
        if (advancedFilters.isbn) {
          params.append('isbn', advancedFilters.isbn);
        }
        if (advancedFilters.publisher) {
          params.append('publisher', advancedFilters.publisher);
        }
        if (advancedFilters.year) {
          params.append('year', advancedFilters.year);
        }
        if (advancedFilters.yearFrom) {
          params.append('yearFrom', advancedFilters.yearFrom);
        }
        if (advancedFilters.yearTo) {
          params.append('yearTo', advancedFilters.yearTo);
        }
        if (advancedFilters.bookType !== 'all') {
          params.append('bookType', advancedFilters.bookType);
        }
        if (advancedFilters.availableOnly) {
          params.append('availableOnly', 'true');
        }
        if (advancedFilters.minRating) {
          params.append('minRating', advancedFilters.minRating);
        }
      } else {
        // Fallback to simple search
        if (searchTerm) {
          params.append('search', searchTerm);
        }
        if (selectedCategory) {
          params.append('category', selectedCategory);
        }
      }

      const response = await fetch(`${API_BASE_URL}/books?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch books');
      }

      let booksData = data.books || [];
      
      // Check for token to fetch holds (don't rely on user state which might not be loaded yet)
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          // Verify user role by checking token, or use user if available
          let shouldFetchHolds = true;
          if (user && (user.role === 'staff' || user.role === 'admin')) {
            shouldFetchHolds = false;
          }
          
          if (shouldFetchHolds) {
            const holdsResponse = await fetch(`${API_BASE_URL}/holds`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (holdsResponse.ok) {
              const holdsData = await holdsResponse.json();
              const activeHolds = (holdsData.holds || []).filter((hold: any) => 
                hold.status === 'pending' || hold.status === 'available'
              );
              
              // Map holds to books
              booksData = booksData.map((book: Book) => {
                const userHold = activeHolds.find((hold: any) => hold.book_id === book.id);
                return {
                  ...book,
                  user_hold_id: userHold ? userHold.id : null
                };
              });
            }
          }
        } catch (err) {
          console.error('Error fetching holds:', err);
        }
      }
      
      setBooks(booksData);
      setPagination(data.pagination || pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load books');
      console.error('Error fetching books:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/books/suggestions?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [pagination.page, selectedCategory]);
  
  // refetch books when user changes (like after login)
  // makes sure holds are fetched after user loads on refresh
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      // small delay to make sure user state is loaded
      const timer = setTimeout(() => {
        fetchBooks();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // debounce the search (wait a bit before searching)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.page === 1) {
        fetchBooks();
      } else {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, advancedFilters, selectedCategory]);

  // fetch search suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        fetchSuggestions(searchTerm);
      } else {
        setSearchSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(e.target.value);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };


  const handlePlaceHold = (bookId: number) => {
    // Navigate to book detail page when "Reserve" is clicked in catalog
    router.push(`/book/${bookId}`);
  };

  const handleCancelReservation = async (holdId: number) => {
    if (!user) {
      setError('Please log in to cancel a reservation');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setPlacingHoldBookId(holdId);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/holds/${holdId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setError('');
        setSuccessMessage('Reservation cancelled successfully!');
        setTimeout(() => setSuccessMessage(''), 5000);
        fetchBooks(); // Refresh to update availability
      } else {
        setError(data.error || 'Failed to cancel reservation');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel reservation');
      setTimeout(() => setError(''), 3000);
    } finally {
      setPlacingHoldBookId(null);
    }
  };

  const handleBorrowBook = (bookId: number) => {
    // Navigate to book detail page when "Get it" is clicked in catalog
    router.push(`/book/${bookId}`);
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      isbn: '',
      publisher: '',
      year: '',
      yearFrom: '',
      yearTo: '',
      bookType: 'all',
      availableOnly: false,
      minRating: ''
    });
  };

  const handleAdvancedFilterChange = (key: string, value: any) => {
    setAdvancedFilters((prev) => ({
      ...prev,
      [key]: value
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleSuggestionClick = (suggestion: any) => {
    if (suggestion.title) {
      setSearchTerm(suggestion.title);
    } else if (suggestion.author) {
      // Author is already searchable in the main search field
    }
    setShowSuggestions(false);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    clearAdvancedFilters();
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

  // Users place holds, staff assigns books

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Library System
              </Link>
              <Link
                href="/catalog"
                className="text-indigo-600 font-semibold px-3 py-2 text-sm border-b-2 border-indigo-600"
              >
                Catalog
              </Link>
              <Link
                href="/contact"
                className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium transition-all duration-200 hover:scale-105"
              >
                Contact
              </Link>
              {user && (
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium transition-all duration-200 hover:scale-105"
                >
                  Dashboard
                </Link>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">{user.displayName || user.email}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <Link
                    href="/dashboard"
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
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
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-3">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Library Catalog
            </span>
          </h1>
          <p className="text-lg text-gray-600">Browse available books</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onFocus={() => setShowSuggestions(searchSuggestions.length > 0)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Search by title, author, or ISBN..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {searchSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                      >
                        {suggestion.title && (
                          <div>
                            <p className="font-medium text-gray-900">{suggestion.title}</p>
                            {suggestion.author && (
                              <p className="text-sm text-gray-600">by {suggestion.author}</p>
                            )}
                          </div>
                        )}
                        {suggestion.isbn && (
                          <p className="text-sm text-gray-600">ISBN: {suggestion.isbn}</p>
                        )}
                        {suggestion.publisher && (
                          <p className="text-sm text-gray-600">Publisher: {suggestion.publisher}</p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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

          </div>

          {/* Advanced Search Toggle */}
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center"
            >
              <svg className={`w-4 h-4 mr-1 transition-transform ${showAdvancedSearch ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {showAdvancedSearch ? 'Hide' : 'Show'} Advanced Search
            </button>
            {(searchTerm || selectedCategory || Object.values(advancedFilters).some(v => v !== '' && v !== 'all' && v !== false)) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('');
                  clearAdvancedFilters();
                }}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Advanced Search Panel */}
          {showAdvancedSearch && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Filters</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* ISBN */}
                <div>
                  <label htmlFor="isbn" className="block text-sm font-medium text-gray-700 mb-2">
                    ISBN
                  </label>
                  <input
                    type="text"
                    id="isbn"
                    value={advancedFilters.isbn}
                    onChange={(e) => handleAdvancedFilterChange('isbn', e.target.value)}
                    placeholder="Enter ISBN..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* Publisher */}
                <div>
                  <label htmlFor="publisher" className="block text-sm font-medium text-gray-700 mb-2">
                    Publisher
                  </label>
                  <input
                    type="text"
                    id="publisher"
                    value={advancedFilters.publisher}
                    onChange={(e) => handleAdvancedFilterChange('publisher', e.target.value)}
                    placeholder="Enter publisher..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* Year */}
                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
                    Publication Year
                  </label>
                  <input
                    type="number"
                    id="year"
                    value={advancedFilters.year}
                    onChange={(e) => handleAdvancedFilterChange('year', e.target.value)}
                    placeholder="e.g., 2020"
                    min="1000"
                    max="9999"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* Year Range */}
                <div>
                  <label htmlFor="yearFrom" className="block text-sm font-medium text-gray-700 mb-2">
                    Year From
                  </label>
                  <input
                    type="number"
                    id="yearFrom"
                    value={advancedFilters.yearFrom}
                    onChange={(e) => handleAdvancedFilterChange('yearFrom', e.target.value)}
                    placeholder="From year..."
                    min="1000"
                    max="9999"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label htmlFor="yearTo" className="block text-sm font-medium text-gray-700 mb-2">
                    Year To
                  </label>
                  <input
                    type="number"
                    id="yearTo"
                    value={advancedFilters.yearTo}
                    onChange={(e) => handleAdvancedFilterChange('yearTo', e.target.value)}
                    placeholder="To year..."
                    min="1000"
                    max="9999"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* Book Type */}
                <div>
                  <label htmlFor="bookType" className="block text-sm font-medium text-gray-700 mb-2">
                    Book Type
                  </label>
                  <select
                    id="bookType"
                    value={advancedFilters.bookType}
                    onChange={(e) => handleAdvancedFilterChange('bookType', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="all">All Types</option>
                    <option value="physical">Physical</option>
                    <option value="electronic">Electronic</option>
                    <option value="both">Both</option>
                  </select>
                </div>

                {/* Availability */}
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="availableOnly"
                    checked={advancedFilters.availableOnly}
                    onChange={(e) => handleAdvancedFilterChange('availableOnly', e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="availableOnly" className="ml-2 block text-sm text-gray-700">
                    Available only
                  </label>
                </div>

                {/* Minimum Rating */}
                <div>
                  <label htmlFor="minRating" className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Rating
                  </label>
                  <select
                    id="minRating"
                    value={advancedFilters.minRating}
                    onChange={(e) => handleAdvancedFilterChange('minRating', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Any Rating</option>
                    <option value="4.5">4.5+ Stars</option>
                    <option value="4.0">4.0+ Stars</option>
                    <option value="3.5">3.5+ Stars</option>
                    <option value="3.0">3.0+ Stars</option>
                    <option value="2.5">2.5+ Stars</option>
                    <option value="2.0">2.0+ Stars</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start">
            <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
            <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-800 font-medium">{error}</p>
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
                  {searchTerm || selectedCategory
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
                      <Link href={`/book/${book.id}`} className="block">
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-2">
                              {book.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">by {book.author}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {book.category && (
                            <span className="inline-block px-2 py-1 text-xs font-medium text-primary-700 bg-primary-100 rounded">
                              {book.category}
                            </span>
                          )}
                          {book.book_type && (
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                              book.book_type === 'electronic' ? 'bg-blue-100 text-blue-800' :
                              book.book_type === 'both' ? 'bg-purple-100 text-purple-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {book.book_type === 'electronic' ? 'Electronic' :
                               book.book_type === 'both' ? 'Both' :
                               'Physical'}
                            </span>
                          )}
                        </div>

                        {/* Star Rating Display */}
                        {book.average_rating && (
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= Math.round(book.average_rating || 0)
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-gray-300'
                                  }`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {book.average_rating.toFixed(1)}
                            </span>
                            {book.total_reviews && (
                              <span className="text-xs text-gray-500">
                                ({book.total_reviews} {book.total_reviews === 1 ? 'review' : 'reviews'})
                              </span>
                            )}
                          </div>
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
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium text-gray-900">
                                  {book.available_copies}
                                </span>{' '}
                                of {book.total_copies} available
                              </p>
                              {book.reserved_count && book.reserved_count > 0 && (
                                <p className="text-xs text-purple-600 mt-1">
                                  <span className="font-medium">{book.reserved_count}</span> reserved
                                </p>
                              )}
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

                          {/* Action Buttons */}
                          {/* Only regular users can place holds/reservations - staff and admin cannot */}
                          {user && user.role !== 'staff' && user.role !== 'admin' && (
                            <div className="space-y-2">
                              {/* Show Reserve/Cancel Reservation button for physical books or both types */}
                              {(book.book_type === 'physical' || book.book_type === 'both') && (
                                <>
                                  {book.user_hold_id ? (
                                    <button
                                      onClick={() => book.user_hold_id && handleCancelReservation(book.user_hold_id)}
                                      disabled={placingHoldBookId === book.user_hold_id || !book.user_hold_id}
                                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      {placingHoldBookId === book.user_hold_id ? (
                                        <>
                                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                          </svg>
                                          Cancelling...
                                        </>
                                      ) : (
                                        <>
                                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                          Cancel Reservation
                                        </>
                                      )}
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => book.id && handlePlaceHold(book.id)}
                                      disabled={!book.id}
                                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                      </svg>
                                      {book.available_copies > 0 ? 'Reserve' : 'Place Hold'}
                                    </button>
                                  )}
                                </>
                              )}
                              
                              {/* Show Get it button for electronic books or both types */}
                              {(book.book_type === 'electronic' || book.book_type === 'both') && (
                                <button
                                  onClick={() => book.id && handleBorrowBook(book.id)}
                                  disabled={!book.id}
                                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  Get it
                                </button>
                              )}
                            </div>
                          )}

                          {!user && (
                            <Link
                              href="/login"
                              className="w-full inline-flex justify-center items-center px-4 py-2 border border-purple-600 text-sm font-medium rounded-md text-purple-600 bg-white hover:bg-purple-50 transition-colors"
                            >
                              Login to Access
                            </Link>
                          )}
                        </div>
                      </div>
                      </Link>
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

