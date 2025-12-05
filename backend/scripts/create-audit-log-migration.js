const pool = require('../config/database');

async function createAuditLogTable() {
  try {
    console.log('Creating audit_log table...');
    
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL,
        action_type ENUM('book_created', 'book_updated', 'book_deleted', 'user_updated', 'user_role_changed', 'user_status_changed') NOT NULL,
        entity_type ENUM('book', 'user') NOT NULL,
        entity_id INT NOT NULL,
        old_values JSON NULL,
        new_values JSON NULL,
        description TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_admin_id (admin_id),
        INDEX idx_entity_type (entity_type),
        INDEX idx_entity_id (entity_id),
        INDEX idx_action_type (action_type),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✓ Audit log table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating audit log table:', error);
    process.exit(1);
  }
}

createAuditLogTable();

