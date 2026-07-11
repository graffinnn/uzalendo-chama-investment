const sequelize = require('../../config/database');

const query = async (sql, params = []) => {
  const [results] = await sequelize.query(sql, {
    replacements: params,
    type: sequelize.constructor.QueryTypes.RAW
  });
  return results;
};

const getMemberCounts = async () => {
  const result = await query(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active,
       SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending,
       SUM(CASE WHEN status = 'INACTIVE' THEN 1 ELSE 0 END) as inactive
     FROM members`
  );
  const row = result[0];
  return {
    total: Number(row.total),
    active: Number(row.active),
    pending: Number(row.pending),
    inactive: Number(row.inactive)
  };
};

const getPoolFundsTotal = async () => {
  const result = await query('SELECT COALESCE(SUM(amount), 0) as total FROM contributions');
  return Number(result[0].total);
};

const getSavingsTotal = async () => {
  const result = await query(
    `SELECT
       COALESCE(SUM(CASE WHEN transaction_type IN ('DEPOSIT','INTEREST','PROFIT_SHARE') THEN amount ELSE 0 END), 0) as total_in,
       COALESCE(SUM(CASE WHEN transaction_type = 'WITHDRAWAL' THEN amount ELSE 0 END), 0) as total_out
     FROM savings`
  );
  return Number(result[0].total_in) - Number(result[0].total_out);
};

const getLoanSummary = async () => {
  const active = await query(
    "SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM loans WHERE status = 'APPROVED'"
  );

  await query(
    "UPDATE loan_repayments SET status = 'OVERDUE' WHERE due_date < CURDATE() AND status = 'PENDING'"
  );

  const overdue = await query(
    "SELECT COUNT(*) as count FROM loan_repayments WHERE status = 'OVERDUE'"
  );

  const pending = await query(
    "SELECT COUNT(*) as count FROM loans WHERE status = 'PENDING'"
  );

  return {
    active_count: Number(active[0].count),
    active_total: Number(active[0].total),
    overdue_count: Number(overdue[0].count),
    pending_approval_count: Number(pending[0].count)
  };
};

const getCurrentCycleStatus = async () => {
  const chama = await query('SELECT id FROM chamas LIMIT 1');
  const cycles = await query(
    "SELECT id, payout_amount, start_date FROM cycles WHERE chama_id = ? AND status = 'ACTIVE' LIMIT 1",
    [chama[0].id]
  );

  if (!cycles || cycles.length === 0) {
    return { has_active_cycle: false, next_payout_member: null, next_payout_date: null, payout_amount: null };
  }

  const cycleId = cycles[0].id;
  const nextPosition = await query(
    `SELECT cp.expected_payout_date, m.full_name
     FROM cycle_positions cp
     JOIN members m ON m.id = cp.member_id
     WHERE cp.cycle_id = ? AND cp.status = 'PENDING'
     ORDER BY cp.position_number ASC
     LIMIT 1`,
    [cycleId]
  );

  if (!nextPosition || nextPosition.length === 0) {
    return { has_active_cycle: true, next_payout_member: null, next_payout_date: null, payout_amount: Number(cycles[0].payout_amount) };
  }

  return {
    has_active_cycle: true,
    next_payout_member: nextPosition[0].full_name,
    next_payout_date: nextPosition[0].expected_payout_date,
    payout_amount: Number(cycles[0].payout_amount)
  };
};

const getPortfolioTotal = async () => {
  const result = await query('SELECT COALESCE(SUM(current_value), 0) as total FROM investments');
  return Number(result[0].total);
};

const getTopMembersByScore = async (limit = 5) => {
  return query(
    `SELECT m.full_name, m.member_number, ms.overall_score
     FROM members m
     JOIN member_scores ms ON ms.member_id = m.id
     WHERE m.status = 'ACTIVE'
     ORDER BY ms.overall_score DESC
     LIMIT ?`,
    [limit]
  );
};

const getRecentActivity = async (limit = 10) => {
  const logs = await query(
    `SELECT al.id, al.action, al.details, al.performed_at,
            a.full_name as admin_name,
            m.full_name as member_name
     FROM audit_logs al
     LEFT JOIN admins a ON a.id = al.performed_by_admin
     LEFT JOIN members m ON m.id = al.performed_by_member
     ORDER BY al.performed_at DESC
     LIMIT ?`,
    [limit]
  );

  return logs.map(log => ({
    id: log.id,
    action: log.action,
    details: log.details,
    performed_at: log.performed_at,
    performed_by: log.admin_name || log.member_name || 'System'
  }));
};

const getAdminDashboard = async () => {
  const [
    memberCounts,
    poolFunds,
    savingsTotal,
    loanSummary,
    cycleStatus,
    portfolioTotal,
    topMembers,
    recentActivity
  ] = await Promise.all([
    getMemberCounts(),
    getPoolFundsTotal(),
    getSavingsTotal(),
    getLoanSummary(),
    getCurrentCycleStatus(),
    getPortfolioTotal(),
    getTopMembersByScore(5),
    getRecentActivity(10)
  ]);

  return {
    member_counts: memberCounts,
    pool_funds_total: poolFunds,
    savings_total: savingsTotal,
    loan_summary: loanSummary,
    cycle_status: cycleStatus,
    portfolio_total: portfolioTotal,
    top_members: topMembers,
    recent_activity: recentActivity
  };
};

module.exports = { getAdminDashboard };