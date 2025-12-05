const pool = require('../config/database');

// Get user details with all their loans, holds, and fines
exports.getUserWithHistory = async (req, res) => {
  try {
    const { id } = req.params;

    // Get user basic info
    const [users] = await pool.execute(
      'SELECT id, uid, email, display_name, role, email_verified, created_at FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Get all loans (active and returned)
    const [loans] = await pool.execute(
      `SELECT l.*, b.title, b.author, b.isbn, b.category
       FROM loans l
       JOIN books b ON l.book_id = b.id
       WHERE l.user_id = ?
       ORDER BY l.loan_date DESC`,
      [id]
    );

    // Get all holds with fulfillment status (check if user got the book)
    const [holds] = await pool.execute(
      `SELECT h.*, b.title, b.author, b.isbn,
       CASE 
         WHEN EXISTS (
           SELECT 1 FROM loans l 
           WHERE l.user_id = h.user_id 
           AND l.book_id = h.book_id 
           AND l.loan_date >= h.hold_date
         ) THEN 'fulfilled'
         WHEN h.status = 'cancelled' THEN 'cancelled'
         WHEN h.status IN ('pending', 'available') THEN 'active'
         ELSE h.status
       END as fulfillment_status
       FROM holds h
       JOIN books b ON h.book_id = b.id
       WHERE h.user_id = ?
       ORDER BY h.hold_date DESC`,
      [id]
    );

    // Get all fines
    const [fines] = await pool.execute(
      `SELECT f.*, 
       b.title as book_title,
       l.id as loan_id,
       h.id as hold_id
       FROM fines f
       LEFT JOIN loans l ON f.loan_id = l.id
       LEFT JOIN holds h ON f.hold_id = h.id
       LEFT JOIN books b ON (l.book_id = b.id OR h.book_id = b.id)
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [id]
    );

    // Calculate statistics
    const activeLoans = loans.filter(l => l.status === 'active').length;
    const totalLoans = loans.length;
    const returnedLoans = loans.filter(l => l.status === 'returned').length;
    const overdueLoans = loans.filter(l => {
      if (l.status !== 'active') return false;
      const dueDate = new Date(l.due_date);
      return dueDate < new Date();
    }).length;
    const totalFines = fines.filter(f => f.status === 'pending').reduce((sum, f) => sum + parseFloat(f.amount), 0);
    const activeHolds = holds.filter(h => h.status === 'pending' || h.status === 'available').length;

    res.json({
      user,
      history: {
        loans,
        holds,
        fines
      },
      statistics: {
        activeLoans,
        totalLoans,
        returnedLoans,
        overdueLoans,
        totalFines: totalFines.toFixed(2),
        activeHolds
      }
    });
  } catch (error) {
    console.error('Get user with history error:', error);
    res.status(500).json({ error: 'Failed to fetch user history' });
  }
};

// Get staff member's activity history
exports.getStaffHistory = async (req, res) => {
  try {
    const { id } = req.params;

    // Get staff basic info
    const [staff] = await pool.execute(
      'SELECT id, uid, email, display_name, role, email_verified, created_at FROM users WHERE id = ? AND role IN ("staff", "admin")',
      [id]
    );

    if (staff.length === 0) {
      return res.status(404).json({ error: 'Staff member not found' });
    }

    const staffMember = staff[0];

    // Get all books assigned by this staff member
    const [assignedLoans] = await pool.execute(
      `SELECT l.*, 
       b.title, b.author, b.isbn, b.category,
       u.email as user_email, u.display_name as user_name
       FROM loans l
       JOIN books b ON l.book_id = b.id
       JOIN users u ON l.user_id = u.id
       WHERE l.assigned_by_staff_id = ?
       ORDER BY l.loan_date DESC`,
      [id]
    );

    // Get all books returned by this staff member
    const [returnedLoans] = await pool.execute(
      `SELECT l.*, 
       b.title, b.author, b.isbn, b.category,
       u.email as user_email, u.display_name as user_name
       FROM loans l
       JOIN books b ON l.book_id = b.id
       JOIN users u ON l.user_id = u.id
       WHERE l.returned_by_staff_id = ?
       ORDER BY l.return_date DESC`,
      [id]
    );

    // Calculate statistics
    const totalAssigned = assignedLoans.length;
    const totalReturned = returnedLoans.length;
    const activeAssigned = assignedLoans.filter(l => l.status === 'active').length;

    res.json({
      staff: staffMember,
      history: {
        assigned: assignedLoans,
        returned: returnedLoans
      },
      statistics: {
        totalAssigned,
        totalReturned,
        activeAssigned
      }
    });
  } catch (error) {
    console.error('Get staff history error:', error);
    res.status(500).json({ error: 'Failed to fetch staff history' });
  }
};

// Get list of all staff members
exports.getAllStaff = async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    let query = 'SELECT id, uid, email, display_name, role, email_verified, created_at FROM users WHERE role IN ("staff", "admin")';
    const params = [];

    if (search) {
      query += ' AND (email LIKE ? OR display_name LIKE ? OR uid LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // LIMIT and OFFSET cannot use placeholders in MySQL prepared statements
    query += ` ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`;

    const [staff] = await pool.execute(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE role IN ("staff", "admin")';
    const countParams = [];

    if (search) {
      countQuery += ' AND (email LIKE ? OR display_name LIKE ? OR uid LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    const [countResult] = await pool.execute(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      staff,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all staff error:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
};

// Get admin's activity log
exports.getAdminHistory = async (req, res) => {
  try {
    console.log('getAdminHistory called, adminId:', req.user?.id);
    const adminId = req.user.id;

    // Check if audit_log table exists
    try {
      const [tableCheck] = await pool.execute(
        `SELECT COUNT(*) as count FROM information_schema.tables 
         WHERE table_schema = DATABASE() AND table_name = 'audit_log'`
      );
      
      if (tableCheck[0].count === 0) {
        // Table doesn't exist, return empty history
        return res.json({
          history: {
            bookActions: [],
            userActions: []
          },
          statistics: {
            booksCreated: 0,
            booksUpdated: 0,
            booksDeleted: 0,
            usersUpdated: 0,
            totalActions: 0
          }
        });
      }
    } catch (checkError) {
      console.error('Table check error:', checkError);
    }

    // Get all audit log entries for this admin
    const [auditLogs] = await pool.execute(
      `SELECT a.*, 
       b.title as book_title, b.author as book_author,
       u.email as user_email, u.display_name as user_name
       FROM audit_log a
       LEFT JOIN books b ON a.entity_type = 'book' AND a.entity_id = b.id
       LEFT JOIN users u ON a.entity_type = 'user' AND a.entity_id = u.id
       WHERE a.admin_id = ?
       ORDER BY a.created_at DESC`,
      [adminId]
    );

    // Separate by action type
    const bookActions = auditLogs.filter(log => log.entity_type === 'book');
    const userActions = auditLogs.filter(log => log.entity_type === 'user');

    // Calculate statistics
    const booksCreated = bookActions.filter(a => a.action_type === 'book_created').length;
    const booksUpdated = bookActions.filter(a => a.action_type === 'book_updated').length;
    const booksDeleted = bookActions.filter(a => a.action_type === 'book_deleted').length;
    const usersUpdated = userActions.filter(a => a.action_type === 'user_updated').length;

    res.json({
      history: {
        bookActions,
        userActions
      },
      statistics: {
        booksCreated,
        booksUpdated,
        booksDeleted,
        usersUpdated,
        totalActions: auditLogs.length
      }
    });
  } catch (error) {
    console.error('Get admin history error:', error);
    
    // If table doesn't exist error, return empty history
    if (error.code === 'ER_NO_SUCH_TABLE' || error.message.includes('audit_log')) {
      return res.json({
        history: {
          bookActions: [],
          userActions: []
        },
        statistics: {
          booksCreated: 0,
          booksUpdated: 0,
          booksDeleted: 0,
          usersUpdated: 0,
          totalActions: 0
        }
      });
    }
    
    res.status(500).json({ error: 'Failed to fetch admin history: ' + error.message });
  }
};

// Generate PDF report with system statistics
exports.generateReport = async (req, res) => {
  const { spawn } = require('child_process');
  const path = require('path');
  const fs = require('fs');
  const os = require('os');

  try {
    // Create temporary directory for report generation
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'library-report-'));
    const pythonScript = path.join(__dirname, '../scripts/generate_report.py');
    
    // Check if Python script exists
    if (!fs.existsSync(pythonScript)) {
      return res.status(500).json({ error: 'Report generation script not found' });
    }

    const isWindows = process.platform === 'win32';
    let command, args;
    
    if (isWindows) {
      command = `py -3.13 "${pythonScript}" "${tempDir}"`;
      args = [];
    } else {
      command = 'python3';
      args = [pythonScript, tempDir];
    }
    
    // Spawn Python process
    const pythonProcess = spawn(command, args, {
      env: {
        ...process.env,
        DB_HOST: process.env.DB_HOST || 'localhost',
        DB_USER: process.env.DB_USER || 'root',
        DB_PASSWORD: process.env.DB_PASSWORD || 'root',
        DB_NAME: process.env.DB_NAME || 'library_system'
      },
      shell: isWindows // Use shell on Windows for better compatibility
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python script error:', stderr);
        // Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });
        return res.status(500).json({ error: 'Failed to generate report: ' + stderr });
      }

      try {
        // Parse output
        const output = JSON.parse(stdout);
        
        if (!output.success) {
          fs.rmSync(tempDir, { recursive: true, force: true });
          return res.status(500).json({ error: output.error || 'Failed to generate report' });
        }

        const pdfPath = output.pdf_path;
        
        if (!fs.existsSync(pdfPath)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
          return res.status(500).json({ error: 'Generated PDF not found' });
        }

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `library-report-${timestamp}.pdf`;

        // Send PDF file
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        const fileStream = fs.createReadStream(pdfPath);
        fileStream.pipe(res);

        // Cleanup after sending
        fileStream.on('end', () => {
          setTimeout(() => {
            fs.rmSync(tempDir, { recursive: true, force: true });
          }, 1000);
        });

      } catch (error) {
        console.error('Error processing report:', error);
        fs.rmSync(tempDir, { recursive: true, force: true });
        res.status(500).json({ error: 'Failed to process report' });
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      fs.rmSync(tempDir, { recursive: true, force: true });
      res.status(500).json({ error: 'Failed to start report generation. Make sure Python 3 is installed.' });
    });

  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

