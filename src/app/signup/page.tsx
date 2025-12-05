'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { validatePassword, validateEmail, getPasswordStrength } from '@/lib/validation';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const { signup } = useAuth();
  const router = useRouter();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear errors on input change
    setErrors([]);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);

    try {
      const validationErrors: string[] = [];
      if (!formData.name.trim()) {
        validationErrors.push('Name is required');
      }

      if (!formData.email.trim()) {
        validationErrors.push('Email is required');
      } else if (!validateEmail(formData.email)) {
        validationErrors.push('Invalid email format');
      }

      if (!formData.password) {
        validationErrors.push('Password is required');
      } else {
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
          validationErrors.push(...passwordValidation.errors);
        }
      }

      if (formData.password !== formData.confirmPassword) {
        validationErrors.push('Passwords do not match');
      }

      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        setLoading(false);
        return;
      }

      // Attempt signup (LIB-08 FR1, FR4)
      const result = await signup(formData.email, formData.password, formData.name);

      // Registration requires email verification - always redirect to verification
      if (result?.requiresVerification) {
        // Show email preview URL if available (for Ethereal Email)
        if (result.emailPreviewUrl) {
          console.log('📧 View verification email at:', result.emailPreviewUrl);
          alert(`Verification email sent!\n\nView email at: ${result.emailPreviewUrl}\n\n(Open this URL to see the verification code)`);
        }
        // Redirect to verification page
        router.push(`/verify-email?email=${encodeURIComponent(formData.email)}`);
        return;
      }

      // Fallback (shouldn't happen)
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (error: any) {
      // LIB-08 FR2: Handle duplicate email and other errors
      setErrors([error.message || 'Failed to create account. Please try again.']);
      setLoading(false);
    }
  };

  // Real-time password validation feedback (LIB-08 NFR2)
  const passwordValidation = validatePassword(formData.password);
  const passwordStrength = formData.password ? getPasswordStrength(formData.password) : null;

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
              Account Created Successfully!
            </h2>
            <p className="text-center text-gray-700 mb-4">
              A verification email has been sent to <strong>{formData.email}</strong>.
            </p>
            <p className="text-center text-gray-600 text-sm">
              Please check your email and verify your account. Redirecting to login...
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
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Sign in
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Please correct the following errors:
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc list-inside space-y-1">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md shadow-sm space-y-4">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="e.g., Ziad Ahmed"
              />
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="you@example.com"
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setPasswordFocused(true)}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="••••••••"
              />

              {/* Password Requirements (LIB-08 FR3) */}
              {passwordFocused && (
                <div className="mt-2 text-xs space-y-1">
                  <p className="font-medium text-gray-700">Password must contain:</p>
                  <ul className="space-y-1 ml-4">
                    <li
                      className={
                        formData.password.length >= 8 ? 'text-green-600' : 'text-gray-500'
                      }
                    >
                      {formData.password.length >= 8 ? '✓' : '○'} At least 8 characters
                    </li>
                    <li
                      className={/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}
                    >
                      {/[A-Z]/.test(formData.password) ? '✓' : '○'} One uppercase letter
                    </li>
                    <li
                      className={/[0-9]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}
                    >
                      {/[0-9]/.test(formData.password) ? '✓' : '○'} One number
                    </li>
                    <li
                      className={
                        /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }
                    >
                      {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) ? '✓' : '○'} One
                      special character
                    </li>
                  </ul>

                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="mt-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-gray-700">Strength:</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              passwordStrength === 'strong'
                                ? 'bg-green-500 w-full'
                                : passwordStrength === 'medium'
                                ? 'bg-yellow-500 w-2/3'
                                : 'bg-red-500 w-1/3'
                            }`}
                          />
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            passwordStrength === 'strong'
                              ? 'text-green-600'
                              : passwordStrength === 'medium'
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {passwordStrength}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
