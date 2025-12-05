'use client';

import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API_BASE_URL = 'http://localhost:5000/api';

export default function VerifyEmailPage() {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get email from URL params or localStorage
    const emailParam = searchParams.get('email');
    const storedEmail = localStorage.getItem('pending_verification_email');
    
    if (emailParam) {
      setEmail(emailParam);
      localStorage.setItem('pending_verification_email', emailParam);
    } else if (storedEmail) {
      setEmail(storedEmail);
    }
  }, [searchParams]);

  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6); // Only numbers, max 6 digits
    setCode(value);
    setError('');
  };

  const handleVerify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code');
      setLoading(false);
      return;
    }

    if (!email) {
      setError('Email address is required');
      setLoading(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }

      // Clear pending verification email
      localStorage.removeItem('pending_verification_email');

      setSuccess(true);
      setLoading(false);

      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setError('Request timed out. Please check your connection and try again.');
      } else {
        setError(error.message || 'Verification failed. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Email address is required');
      return;
    }

    setResending(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend verification code');
      }

      setError('');
      alert('Verification code has been sent to your email!');
    } catch (error: any) {
      setError(error.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center justify-center mb-4">
              <svg
                className="h-12 w-12 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-center text-2xl font-bold text-gray-900 mb-2">
              Email Verified!
            </h2>
            <p className="text-center text-gray-700 mb-4">
              Your email has been successfully verified. Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify Your Email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter the 6-digit code sent to{' '}
            {email && <span className="font-medium">{email}</span>}
            {!email && <span className="font-medium text-red-600">(email not found)</span>}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleVerify}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="code" className="sr-only">
              Verification Code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              value={code}
              onChange={handleCodeChange}
              className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
              placeholder="000000"
              maxLength={6}
              autoComplete="off"
            />
            <p className="mt-2 text-center text-sm text-gray-500">
              Enter the 6-digit code from your email
            </p>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || !email}
              className="text-sm text-primary-600 hover:text-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? 'Sending...' : "Didn't receive code? Resend"}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-500"
            >
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

