const pool = require('../config/database');

// Cache for current policy (refresh on updates)
let cachedPolicy = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get current active loan policy
exports.getCurrentPolicy = async () => {
  try {
    // Check cache first
    const now = Date.now();
    if (cachedPolicy && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      return cachedPolicy;
    }

    const [policies] = await pool.execute(
      'SELECT * FROM loan_policies WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 1'
    );

    if (policies.length === 0) {
      // Return default policy
      cachedPolicy = {
        loan_period_days: 14,
        max_loans_per_user: 5,
        max_renewals_per_loan: 1,
        fine_rate_per_day: 5.00,
        grace_period_days: 0
      };
    } else {
      cachedPolicy = {
        loan_period_days: policies[0].loan_period_days,
        max_loans_per_user: policies[0].max_loans_per_user,
        max_renewals_per_loan: policies[0].max_renewals_per_loan,
        fine_rate_per_day: parseFloat(policies[0].fine_rate_per_day),
        grace_period_days: policies[0].grace_period_days
      };
    }

    cacheTimestamp = now;
    return cachedPolicy;
  } catch (error) {
    console.error('Error getting loan policy:', error);
    // Return default policy on error
    return {
      loan_period_days: 14,
      max_loans_per_user: 5,
      max_renewals_per_loan: 1,
      fine_rate_per_day: 5.00,
      grace_period_days: 0
    };
  }
};

// Clear cache (call this when policy is updated)
exports.clearCache = () => {
  cachedPolicy = null;
  cacheTimestamp = null;
};

