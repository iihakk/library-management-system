'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import StarRating from '@/components/StarRating';

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
  average_rating?: number | null;
  total_reviews?: number;
  download_link?: string;
  user_hold_id?: number | null; // ID of user's active hold on this book
}

interface Review {
  id: number;
  user_id: number;
  user_name: string;
  rating: number;
  review_text?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  is_current_user?: boolean;
}

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [placingHold, setPlacingHold] = useState(false);
  const [borrowing, setBorrowing] = useState(false);
  const [userHoldId, setUserHoldId] = useState<number | null>(null);

  const bookId = params?.id as string;

  useEffect(() => {
    if (bookId) {
      fetchBookDetails();
      fetchReviews();
    }
  }, [bookId]);

  const fetchBookDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/books/${bookId}`);
      if (!response.ok) throw new Error('Failed to fetch book');
      const data = await response.json();
      setBook(data);
      
      // Check if user has an active hold on this book
      if (user && user.role !== 'staff' && user.role !== 'admin') {
        try {
          const token = localStorage.getItem('auth_token');
          const holdsResponse = await fetch(`${API_BASE_URL}/holds`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (holdsResponse.ok) {
            const holdsData = await holdsResponse.json();
            const activeHold = (holdsData.holds || []).find((hold: any) => 
              hold.book_id === parseInt(bookId) && (hold.status === 'pending' || hold.status === 'available')
            );
            setUserHoldId(activeHold ? activeHold.id : null);
          }
        } catch (err) {
          console.error('Error fetching holds:', err);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceHold = async () => {
    if (!user || !book) return;
    
    setPlacingHold(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/holds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ book_id: book.id })
      });

      const data = await response.json();

      if (response.ok) {
        setError('');
        setSuccessMessage('Reservation placed successfully! Visit the library to pick up your book. You have 48 hours once it becomes available.');
        setTimeout(() => setSuccessMessage(''), 5000);
        fetchBookDetails(); // This will refresh and show "Cancel Reservation" button
      } else {
        setError(data.error || 'Failed to place hold');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to place hold');
      setTimeout(() => setError(''), 3000);
    } finally {
      setPlacingHold(false);
    }
  };

  const handleCancelReservation = async (holdId: number) => {
    if (!user || !book) return;
    
    setPlacingHold(true);
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
        fetchBookDetails(); // This will refresh and show "Reserve" button
      } else {
        setError(data.error || 'Failed to cancel reservation');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel reservation');
      setTimeout(() => setError(''), 3000);
    } finally {
      setPlacingHold(false);
    }
  };

  const handleBorrowBook = async () => {
    if (!user || !book) return;
    
    // For electronic books, just open the link directly without creating a loan
    if (book.book_type === 'electronic' || book.book_type === 'both') {
      if (book.download_link) {
        window.open(book.download_link, '_blank');
        setSuccessMessage('Opening book...');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError('Download link not available for this book. Please contact the library.');
        setTimeout(() => setError(''), 3000);
      }
      return;
    }

    // For physical books (shouldn't happen with "Get it" button, but just in case)
    setBorrowing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/loans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ book_id: book.id })
      });

      const data = await response.json();

      if (response.ok) {
        setError('');
        setSuccessMessage('Book borrowed successfully!');
        setTimeout(() => setSuccessMessage(''), 5000);
        fetchBookDetails();
      } else {
        setError(data.error || 'Failed to borrow book');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to borrow book');
      setTimeout(() => setError(''), 3000);
    } finally {
      setBorrowing(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/reviews/book/${bookId}?status=approved`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
        
        // Find user's review
        const currentUserReview = data.reviews?.find((r: Review) => r.is_current_user);
        if (currentUserReview) {
          setUserReview(currentUserReview);
          setRating(currentUserReview.rating);
          setReviewText(currentUserReview.review_text || '');
        }
      }
    } catch (err: any) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/reviews/book/${bookId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating,
          review_text: reviewText.trim() || null
        })
      });

      if (response.ok) {
        setSuccessMessage(userReview ? 'Review updated successfully!' : 'Review submitted successfully!');
        setShowReviewForm(false);
        fetchReviews();
        fetchBookDetails();
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit review');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview) return;
    
    if (!confirm('Are you sure you want to delete your review?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/reviews/${userReview.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSuccessMessage('Review deleted successfully');
        setUserReview(null);
        setRating(0);
        setReviewText('');
        fetchReviews();
        fetchBookDetails();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete review');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading book details...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Book not found</h1>
          <Link href="/catalog" className="text-primary-600 hover:text-primary-700">
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Link
          href="/catalog"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Catalog
        </Link>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}

        {/* Book Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{book.title}</h1>
              <p className="text-xl text-gray-600 mb-6">by {book.author}</p>

              {/* Rating Display */}
              {book.average_rating && (
                <div className="flex items-center gap-3 mb-6">
                  <StarRating rating={book.average_rating} size="lg" />
                  <div>
                    <span className="text-2xl font-bold text-gray-900">{book.average_rating.toFixed(1)}</span>
                    {book.total_reviews && (
                      <span className="text-gray-600 ml-2">
                        ({book.total_reviews} {book.total_reviews === 1 ? 'review' : 'reviews'})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {book.description && (
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">Description</h2>
                  <p className="text-gray-700 leading-relaxed">{book.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                {book.category && (
                  <div>
                    <span className="font-medium text-gray-600">Category:</span>
                    <span className="ml-2 text-gray-900">{book.category}</span>
                  </div>
                )}
                {book.publication_year && (
                  <div>
                    <span className="font-medium text-gray-600">Year:</span>
                    <span className="ml-2 text-gray-900">{book.publication_year}</span>
                  </div>
                )}
                {book.publisher && (
                  <div>
                    <span className="font-medium text-gray-600">Publisher:</span>
                    <span className="ml-2 text-gray-900">{book.publisher}</span>
                  </div>
                )}
                {book.isbn && (
                  <div>
                    <span className="font-medium text-gray-600">ISBN:</span>
                    <span className="ml-2 text-gray-900">{book.isbn}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-600">Type:</span>
                  <span className="ml-2 text-gray-900">
                    {book.book_type === 'electronic' ? 'Electronic' :
                     book.book_type === 'both' ? 'Physical & Electronic' :
                     'Physical'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-600">Available:</span>
                  <span className="ml-2 text-gray-900">
                    {book.available_copies} of {book.total_copies} copies
                  </span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Get This Book</h3>
                
                {user && user.role !== 'staff' && user.role !== 'admin' && (
                  <div className="space-y-3">
                    {/* Show Reserve/Cancel Reservation button for physical books or both types */}
                    {(book.book_type === 'physical' || book.book_type === 'both') && (
                      <>
                        {userHoldId ? (
                          <button
                            onClick={() => handleCancelReservation(userHoldId)}
                            disabled={placingHold || borrowing}
                            className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {placingHold ? (
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
                            onClick={handlePlaceHold}
                            disabled={placingHold || borrowing || book.available_copies <= 0}
                            className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {placingHold ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Placing Hold...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                                Reserve
                              </>
                            )}
                          </button>
                        )}
                      </>
                    )}
                    
                    {/* Show Get it button for electronic books or both types */}
                    {(book.book_type === 'electronic' || book.book_type === 'both') && (
                      <button
                        onClick={handleBorrowBook}
                        disabled={borrowing || placingHold || book.available_copies <= 0}
                        className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {borrowing ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Borrowing...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Get it
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {!user && (
                  <Link
                    href="/login"
                    className="w-full inline-flex justify-center items-center px-4 py-3 border border-purple-600 text-sm font-medium rounded-md text-purple-600 bg-white hover:bg-purple-50 transition-colors"
                  >
                    Login to Access
                  </Link>
                )}

                {user && (user.role === 'staff' || user.role === 'admin') && (
                  <p className="text-sm text-gray-600">Staff and admin members cannot place reservations or borrow books.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Reviews ({reviews.length})
            </h2>
            {user && (
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                {userReview ? 'Edit Review' : 'Write a Review'}
              </button>
            )}
          </div>

          {/* Review Form */}
          {showReviewForm && user && (
            <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {userReview ? 'Edit Your Review' : 'Write a Review'}
              </h3>
              <form onSubmit={handleSubmitReview}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating *
                  </label>
                  <StarRating
                    rating={rating}
                    interactive={true}
                    onRatingChange={setRating}
                    currentRating={rating}
                    size="lg"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review (optional)
                  </label>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Share your thoughts about this book..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting || rating === 0}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? 'Submitting...' : userReview ? 'Update Review' : 'Submit Review'}
                  </button>
                  {userReview && (
                    <button
                      type="button"
                      onClick={handleDeleteReview}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Delete Review
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowReviewForm(false);
                      if (!userReview) {
                        setRating(0);
                        setReviewText('');
                      }
                    }}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No reviews yet. Be the first to review this book!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-gray-200 pb-6 last:border-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-semibold">
                          {review.user_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{review.user_name}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(review.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                  {review.review_text && (
                    <p className="text-gray-700 mt-3 leading-relaxed">{review.review_text}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

