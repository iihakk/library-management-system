'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  signup: async () => {},
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  const signup = async (email: string, password: string, name: string) => {
    setLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check for duplicate email (mock)
    const existingUser = localStorage.getItem('demo_user_' + email);
    if (existingUser) {
      setLoading(false);
      throw new Error('Email already registered - Please sign in or use different email');
    }

    // Create mock user
    const newUser = {
      uid: Math.random().toString(36).substr(2, 9),
      email,
      displayName: name,
      emailVerified: false,
    };

    localStorage.setItem('demo_user_' + email, JSON.stringify({ ...newUser, password }));
    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    setLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const storedUser = localStorage.getItem('demo_user_' + email);

    if (!storedUser) {
      setLoading(false);
      throw new Error('Invalid email or password');
    }

    const userData = JSON.parse(storedUser);

    if (userData.password !== password) {
      setLoading(false);
      throw new Error('Invalid email or password');
    }

    setUser({
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName,
      emailVerified: userData.emailVerified,
    });

    localStorage.setItem('demo_current_user', JSON.stringify(userData));
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser(null);
    localStorage.removeItem('demo_current_user');
    setLoading(false);
  };

  // Check for existing session on mount
  React.useEffect(() => {
    const currentUser = localStorage.getItem('demo_current_user');
    if (currentUser) {
      const userData = JSON.parse(currentUser);
      setUser({
        uid: userData.uid,
        email: userData.email,
        displayName: userData.displayName,
        emailVerified: userData.emailVerified,
      });
    }
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    signup,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
