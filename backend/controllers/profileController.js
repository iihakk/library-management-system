const pool = require('../config/database');
const bcrypt = require('bcryptjs');

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.execute(
      `SELECT id, uid, email, display_name, email_verified, role, university_id, created_at, updated_at
       FROM users
       WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Get user statistics
    const [loanStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_loans,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_loans,
        SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned_loans
       FROM loans
       WHERE user_id = ?`,
      [userId]
    );

    const [holdStats] = await pool.execute(
      `SELECT COUNT(*) as total_holds
       FROM holds
       WHERE user_id = ?`,
      [userId]
    );

    const [fineStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total_fines,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_fines_amount,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_fines_amount
       FROM fines
       WHERE user_id = ?`,
      [userId]
    );

    res.json({
      profile: {
        id: user.id,
        uid: user.uid,
        email: user.email,
        displayName: user.display_name,
        emailVerified: user.email_verified,
        role: user.role,
        universityId: user.university_id,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      },
      statistics: {
        loans: {
          total: loanStats[0].total_loans || 0,
          active: loanStats[0].active_loans || 0,
          returned: loanStats[0].returned_loans || 0
        },
        holds: {
          total: holdStats[0].total_holds || 0
        },
        fines: {
          total: fineStats[0].total_fines || 0,
          pendingAmount: parseFloat(fineStats[0].pending_fines_amount || 0),
          paidAmount: parseFloat(fineStats[0].paid_fines_amount || 0)
        }
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { displayName, universityId } = req.body;

    if (!displayName || displayName.trim().length === 0) {
      return res.status(400).json({ error: 'Display name is required' });
    }

    if (displayName.trim().length < 2) {
      return res.status(400).json({ error: 'Display name must be at least 2 characters' });
    }

    if (displayName.trim().length > 255) {
      return res.status(400).json({ error: 'Display name must be less than 255 characters' });
    }

    const updateFields = ['display_name = ?'];
    const params = [displayName.trim()];

    if (universityId !== undefined) {
      updateFields.push('university_id = ?');
      params.push(universityId);
    }

    params.push(userId);

    await pool.execute(
      `UPDATE users 
       SET ${updateFields.join(', ')}, updated_at = NOW()
       WHERE id = ?`,
      params
    );

    const [updatedUsers] = await pool.execute(
      `SELECT id, uid, email, display_name, email_verified, role, university_id, created_at, updated_at
       FROM users
       WHERE id = ?`,
      [userId]
    );

    res.json({
      message: 'Profile updated successfully',
      profile: {
        id: updatedUsers[0].id,
        uid: updatedUsers[0].uid,
        email: updatedUsers[0].email,
        displayName: updatedUsers[0].display_name,
        emailVerified: updatedUsers[0].email_verified,
        role: updatedUsers[0].role,
        universityId: updatedUsers[0].university_id,
        createdAt: updatedUsers[0].created_at,
        updatedAt: updatedUsers[0].updated_at
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get current user password
    const [users] = await pool.execute(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, users[0].password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.execute(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, userId]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

