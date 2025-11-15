const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (userId, email, role) => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
    { expiresIn: '7d' }
  );
};

// Signup
exports.signup = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // SECURITY: Explicitly reject any role parameter - users can only sign up as 'user'
    if (role && role !== 'user') {
      return res.status(403).json({ 
        error: 'Invalid role. Only regular user accounts can be created through signup.' 
      });
    }

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Please provide email, password, and name' 
      });
    }

    // Check if email already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        error: 'Email already registered - Please sign in or use different email' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique ID
    const uid = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

    // SECURITY: Always set role to 'user' - never allow admin/staff creation through signup
    const userRole = 'user';

    // Insert user (always 'user' role - admin/staff must be created by existing admins)
    const [result] = await pool.execute(
      'INSERT INTO users (uid, email, password, display_name, email_verified, role) VALUES (?, ?, ?, ?, ?, ?)',
      [uid, email, hashedPassword, name, false, userRole]
    );

    // Generate token
    const token = generateToken(result.insertId, email, 'user');

    // Return user data (without password)
    res.status(201).json({
      message: 'Account created successfully',
      user: {
        uid,
        email,
        displayName: name,
        emailVerified: false,
        role: 'user'
      },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Please provide both email and password' 
      });
    }

    // Find user
    const [users] = await pool.execute(
      'SELECT id, uid, email, password, display_name, email_verified, role FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    const user = users[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Generate token
    const token = generateToken(user.id, user.email, user.role || 'user');

    // Return user data (without password)
    res.json({
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.display_name,
        emailVerified: user.email_verified,
        role: user.role || 'user'
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login. Please try again.' });
  }
};

// Logout (client-side token removal, but we can verify token here if needed)
exports.logout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // But we can add token blacklisting here if needed
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
};

// Verify token and get user
exports.verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
    );

    // Get user from database
    const [users] = await pool.execute(
      'SELECT id, uid, email, display_name, email_verified, role FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = users[0];

    res.json({
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.display_name,
        emailVerified: user.email_verified,
        role: user.role || 'user'
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Create staff member (admin only)
exports.createStaff = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Please provide email, password, and name' 
      });
    }

    // Check if email already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ 
        error: 'Email already registered' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique ID
    const uid = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

    // Insert staff member
    const [result] = await pool.execute(
      'INSERT INTO users (uid, email, password, display_name, email_verified, role) VALUES (?, ?, ?, ?, ?, ?)',
      [uid, email, hashedPassword, name, true, 'staff']
    );

    // Return staff data (without password)
    res.status(201).json({
      message: 'Staff member created successfully',
      user: {
        uid,
        email,
        displayName: name,
        emailVerified: true,
        role: 'staff'
      }
    });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ error: 'Failed to create staff member. Please try again.' });
  }
};

