const pool = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Activate user account
exports.activateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id, uid, email, display_name, role, is_active FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Prevent deactivating yourself
    if (parseInt(id) === adminId) {
      return res.status(400).json({ error: 'You cannot activate/deactivate your own account' });
    }

    // Activate user - use explicit 1 for MySQL BOOLEAN (TINYINT)
    await pool.execute(
      'UPDATE users SET is_active = 1 WHERE id = ?',
      [id]
    );

    // Log admin action
    try {
      await pool.execute(
        'INSERT INTO audit_log (admin_id, action_type, entity_type, entity_id, old_values, new_values, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          adminId,
          'user_activated',
          'user',
          id,
          JSON.stringify({ is_active: user.is_active }),
          JSON.stringify({ is_active: true }),
          `Activated user: ${user.email} (${user.display_name})`
        ]
      );
    } catch (logError) {
      console.error('Failed to log admin action:', logError);
    }

    res.json({
      message: 'User activated successfully',
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        is_active: true
      }
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ error: 'Failed to activate user' });
  }
};

// Deactivate user account
exports.deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id, uid, email, display_name, role, is_active FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Prevent deactivating yourself
    if (parseInt(id) === adminId) {
      return res.status(400).json({ error: 'You cannot activate/deactivate your own account' });
    }

    // Prevent deactivating other admins
    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Cannot deactivate admin accounts' });
    }

    // Deactivate user - use explicit 0 for MySQL BOOLEAN (TINYINT)
    await pool.execute(
      'UPDATE users SET is_active = 0 WHERE id = ?',
      [id]
    );

    // Log admin action
    try {
      await pool.execute(
        'INSERT INTO audit_log (admin_id, action_type, entity_type, entity_id, old_values, new_values, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          adminId,
          'user_deactivated',
          'user',
          id,
          JSON.stringify({ is_active: user.is_active }),
          JSON.stringify({ is_active: false }),
          `Deactivated user: ${user.email} (${user.display_name})`
        ]
      );
    } catch (logError) {
      console.error('Failed to log admin action:', logError);
    }

    res.json({
      message: 'User deactivated successfully',
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        is_active: false
      }
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
};

// Change user role
exports.changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const adminId = req.user.id;

    if (!role || !['user', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be user, staff, or admin' });
    }

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id, uid, email, display_name, role FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Prevent changing your own role
    if (parseInt(id) === adminId) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }

    // Prevent demoting other admins
    if (user.role === 'admin' && role !== 'admin') {
      return res.status(400).json({ error: 'Cannot change role of admin accounts' });
    }

    // Update role
    await pool.execute(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, id]
    );

    // Log admin action
    try {
      await pool.execute(
        'INSERT INTO audit_log (admin_id, action_type, entity_type, entity_id, old_values, new_values, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          adminId,
          'user_role_changed',
          'user',
          id,
          JSON.stringify({ role: user.role }),
          JSON.stringify({ role }),
          `Changed role of ${user.email} (${user.display_name}) from ${user.role} to ${role}`
        ]
      );
    } catch (logError) {
      console.error('Failed to log admin action:', logError);
    }

    res.json({
      message: 'User role updated successfully',
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        role
      }
    });
  } catch (error) {
    console.error('Change user role error:', error);
    res.status(500).json({ error: 'Failed to change user role' });
  }
};

// Reset user password (admin-initiated)
exports.resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const adminId = req.user.id;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user exists
    const [users] = await pool.execute(
      'SELECT id, uid, email, display_name, role FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );

    // Log admin action
    try {
      await pool.execute(
        'INSERT INTO audit_log (admin_id, action_type, entity_type, entity_id, description) VALUES (?, ?, ?, ?, ?)',
        [
          adminId,
          'user_password_reset',
          'user',
          id,
          `Admin reset password for user: ${user.email} (${user.display_name})`
        ]
      );
    } catch (logError) {
      console.error('Failed to log admin action:', logError);
    }

    res.json({
      message: 'User password reset successfully',
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name
      }
    });
  } catch (error) {
    console.error('Reset user password error:', error);
    res.status(500).json({ error: 'Failed to reset user password' });
  }
};

