const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const emailService = require('../services/emailService');

// Generate JWT token
const generateToken = (userId, email, role) => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
    { expiresIn: '7d' }
  );
};

// Generate 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Signup
exports.signup = async (req, res) => {
  try {
    const { email, password, name, role, university_id } = req.body;

    // Prevent role manipulation - users can only sign up as regular users
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

    // Validate university email domain
    const emailValidation = emailService.validateUniversityEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({ 
        error: emailValidation.reason 
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

    // Force role to 'user' - admins/staff must be created manually
    const userRole = 'user';
    const [result] = await pool.execute(
      'INSERT INTO users (uid, email, password, display_name, email_verified, role, university_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uid, email, hashedPassword, name, false, userRole, university_id || null]
    );

    const userId = result.insertId;

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Code expires in 15 minutes

    // Store verification code in database
    await pool.execute(
      'INSERT INTO email_verification_codes (user_id, email, code, expires_at) VALUES (?, ?, ?, ?)',
      [userId, email, verificationCode, expiresAt]
    );

    // Send verification email
    let emailSent = false;
    let emailError = null;
    let emailPreviewUrl = null;
    try {
      const emailResult = await emailService.sendVerificationCode(email, verificationCode, name);
      emailSent = true;
      emailPreviewUrl = emailResult.previewUrl || null;
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      emailError = emailError.message || 'Failed to send email';
      // Continue with signup - user can request resend later
    }

    // Don't give token yet - need email verification first
    res.status(201).json({
      message: emailSent 
        ? 'Account created. Please check your email for verification code to complete registration.'
        : 'Account created, but email could not be sent. Please use resend verification.',
      email: email,
      requiresVerification: true,
      emailSent,
      emailError: emailError || null,
      emailPreviewUrl: emailPreviewUrl || null,
      verificationCode: emailSent ? undefined : verificationCode
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

    // Allow login even if email not verified

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

// Logout
exports.logout = async (req, res) => {
  try {
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

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    let query = 'SELECT id, uid, email, display_name, role, email_verified, created_at FROM users WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (email LIKE ? OR display_name LIKE ? OR uid LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    // LIMIT and OFFSET cannot use placeholders in MySQL prepared statements
    query += ` ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [users] = await pool.execute(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const countParams = [];

    if (search) {
      countQuery += ' AND (email LIKE ? OR display_name LIKE ? OR uid LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (role) {
      countQuery += ' AND role = ?';
      countParams.push(role);
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get user by ID (admin only)
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const [users] = await pool.execute(
      'SELECT id, uid, email, display_name, role, email_verified, created_at FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Verify email with code
exports.verifyEmail = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ 
        error: 'Please provide email and verification code' 
      });
    }

    const [codes] = await pool.execute(
      `SELECT evc.*, u.id as user_id, u.display_name 
       FROM email_verification_codes evc
       JOIN users u ON evc.user_id = u.id
       WHERE evc.email = ? AND evc.code = ? AND evc.verified = FALSE AND evc.expires_at > NOW()`,
      [email, code]
    );

    if (codes.length === 0) {
      // Check if code exists but is expired or already used
      const [allCodes] = await pool.execute(
        `SELECT evc.* FROM email_verification_codes evc
         WHERE evc.email = ? AND evc.code = ?`,
        [email, code]
      );
      if (allCodes.length > 0) {
        const codeRecord = allCodes[0];
        if (codeRecord.verified) {
          return res.status(400).json({ 
            error: 'This verification code has already been used' 
          });
        } else if (new Date(codeRecord.expires_at) < new Date()) {
          return res.status(400).json({ 
            error: 'Verification code has expired. Please request a new code.' 
          });
        }
      }
      return res.status(400).json({ 
        error: 'Invalid verification code. Please check and try again.' 
      });
    }

    const verificationRecord = codes[0];
    await pool.execute(
      'UPDATE email_verification_codes SET verified = TRUE WHERE id = ?',
      [verificationRecord.id]
    );

    await pool.execute(
      'UPDATE users SET email_verified = TRUE WHERE id = ?',
      [verificationRecord.user_id]
    );

    // Invalidate all other codes for this user
    await pool.execute(
      'UPDATE email_verification_codes SET verified = TRUE WHERE user_id = ? AND id != ?',
      [verificationRecord.user_id, verificationRecord.id]
    );

    // Send welcome email in background
    emailService.sendWelcomeEmail(email, verificationRecord.display_name)
      .catch(err => console.error('Welcome email failed:', err));

    // Get updated user
    const [users] = await pool.execute(
      'SELECT id, uid, email, display_name, email_verified, role FROM users WHERE id = ?',
      [verificationRecord.user_id]
    );

    const user = users[0];

    // Generate new token with verified status
    const token = generateToken(user.id, user.email, user.role || 'user');
    console.log('Token generated, sending response...');

    res.json({
      message: 'Email verified successfully!',
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.display_name,
        emailVerified: true,
        role: user.role || 'user'
      },
      token
    });
    console.log('✅ Verification response sent successfully');
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Failed to verify email. Please try again.' });
  }
};

// Resend verification code
exports.resendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: 'Please provide email address' 
      });
    }

    // Find user
    const [users] = await pool.execute(
      'SELECT id, email, display_name, email_verified FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ 
        error: 'User not found' 
      });
    }

    const user = users[0];

    if (user.email_verified) {
      return res.status(400).json({ 
        error: 'Email is already verified' 
      });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Code expires in 15 minutes

    // Invalidate old codes
    await pool.execute(
      'UPDATE email_verification_codes SET verified = TRUE WHERE user_id = ? AND verified = FALSE',
      [user.id]
    );

    // Store new verification code
    await pool.execute(
      'INSERT INTO email_verification_codes (user_id, email, code, expires_at) VALUES (?, ?, ?, ?)',
      [user.id, email, verificationCode, expiresAt]
    );

    // Send verification email
    try {
      await emailService.sendVerificationCode(email, verificationCode, user.display_name);
      res.json({
        message: 'Verification code has been sent to your email'
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      res.status(500).json({ 
        error: 'Failed to send verification email. Please try again later.' 
      });
    }
  } catch (error) {
    console.error('Resend verification code error:', error);
    res.status(500).json({ error: 'Failed to resend verification code. Please try again.' });
  }
};

// Request password reset - send code to email
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: 'Please provide email address' 
      });
    }

    // Find user by email
    const [users] = await pool.execute(
      'SELECT id, email, display_name FROM users WHERE email = ?',
      [email]
    );

    // Don't reveal if email exists (security)
    if (users.length === 0) {
      return res.json({
        message: 'If an account with that email exists, a password reset code has been sent.'
      });
    }

    const user = users[0];

    // Generate reset code
    const resetCode = generateVerificationCode();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // Code expires in 15 minutes

    // Invalidate old reset codes for this user
    await pool.execute(
      'UPDATE email_verification_codes SET verified = TRUE WHERE user_id = ? AND verified = FALSE',
      [user.id]
    );

    // Store reset code in database (reuse email_verification_codes table)
    await pool.execute(
      'INSERT INTO email_verification_codes (user_id, email, code, expires_at) VALUES (?, ?, ?, ?)',
      [user.id, email, resetCode, expiresAt]
    );

    // Send password reset email
    let emailSent = false;
    let emailPreviewUrl = null;
    try {
      const emailResult = await emailService.sendPasswordResetCode(email, resetCode, user.display_name);
      emailSent = true;
      emailPreviewUrl = emailResult.previewUrl || null;
      console.log('Password reset email sent successfully to:', email);
      
      if (emailPreviewUrl) {
        console.log('\n🔗 PASSWORD RESET EMAIL PREVIEW URL:', emailPreviewUrl);
      }
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return res.status(500).json({ 
        error: 'Failed to send password reset email. Please try again later.' 
      });
    }

    res.json({
      message: 'If an account with that email exists, a password reset code has been sent.',
      emailPreviewUrl: emailPreviewUrl || null // For Ethereal Email preview
    });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({ error: 'Failed to process password reset request. Please try again.' });
  }
};

// Verify password reset code
exports.verifyPasswordResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ 
        error: 'Please provide email and verification code' 
      });
    }

    // Find valid reset code
    const [codes] = await pool.execute(
      `SELECT evc.*, u.id as user_id, u.display_name 
       FROM email_verification_codes evc
       JOIN users u ON evc.user_id = u.id
       WHERE evc.email = ? AND evc.code = ? AND evc.verified = FALSE AND evc.expires_at > NOW()`,
      [email, code]
    );

    if (codes.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or expired verification code' 
      });
    }

    // Code looks good
    res.json({
      message: 'Verification code is valid',
      valid: true
    });
  } catch (error) {
    console.error('Verify password reset code error:', error);
    res.status(500).json({ error: 'Failed to verify code. Please try again.' });
  }
};

// Reset password with verified code
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ 
        error: 'Please provide email, verification code, and new password' 
      });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Find valid reset code
    const [codes] = await pool.execute(
      `SELECT evc.*, u.id as user_id, u.display_name 
       FROM email_verification_codes evc
       JOIN users u ON evc.user_id = u.id
       WHERE evc.email = ? AND evc.code = ? AND evc.verified = FALSE AND evc.expires_at > NOW()`,
      [email, code]
    );

    if (codes.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid or expired verification code' 
      });
    }

    const verificationRecord = codes[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, verificationRecord.user_id]
    );

    // Mark code as verified (so it can't be reused)
    await pool.execute(
      'UPDATE email_verification_codes SET verified = TRUE WHERE id = ?',
      [verificationRecord.id]
    );

    // Invalidate all other codes for this user
    await pool.execute(
      'UPDATE email_verification_codes SET verified = TRUE WHERE user_id = ? AND id != ?',
      [verificationRecord.user_id, verificationRecord.id]
    );

    console.log('Password reset successful for user:', verificationRecord.user_id);

    res.json({
      message: 'Password has been reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
};

