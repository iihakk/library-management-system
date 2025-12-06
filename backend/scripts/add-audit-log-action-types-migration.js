const pool = require('../config/database');

async function addAuditLogActionTypes() {
  try {
    console.log('Adding new action types to audit_log table...');
    
    // Check if audit_log table exists
    const [tables] = await pool.execute(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = DATABASE() AND table_name = 'audit_log'`
    );

    if (tables[0].count === 0) {
      console.log('audit_log table does not exist. Please run create-audit-log-migration.js first.');
      process.exit(1);
    }

    // Get current ENUM values
    const [columns] = await pool.execute(
      `SELECT COLUMN_TYPE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'audit_log' 
       AND COLUMN_NAME = 'action_type'`
    );

    if (columns.length === 0) {
      console.log('action_type column not found in audit_log table.');
      process.exit(1);
    }

    const currentEnum = columns[0].COLUMN_TYPE;
    console.log('Current action_type ENUM:', currentEnum);

    // Check if new values already exist
    if (currentEnum.includes('user_activated') && 
        currentEnum.includes('user_deactivated') && 
        currentEnum.includes('user_password_reset')) {
      console.log('New action types already exist. Skipping migration.');
      process.exit(0);
    }

    // Modify the ENUM to include new action types
    // We need to include all existing values plus the new ones
    await pool.execute(
      `ALTER TABLE audit_log 
       MODIFY COLUMN action_type ENUM(
         'book_created', 
         'book_updated', 
         'book_deleted', 
         'user_updated', 
         'user_role_changed', 
         'user_status_changed',
         'user_activated',
         'user_deactivated',
         'user_password_reset',
         'loan_policy_updated'
       ) NOT NULL`
    );

    console.log('Successfully added new action types to audit_log table.');
    console.log('New action types: user_activated, user_deactivated, user_password_reset');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

addAuditLogActionTypes();

