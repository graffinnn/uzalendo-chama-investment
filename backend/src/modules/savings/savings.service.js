const sequelize = require('../../config/database');

const recordSavings = async (input, adminId) => {
  const member_id = Number(input.member_id);
  const amount = Number(input.amount);
  const transaction_type = String(input.transaction_type);
  const notes = String(input.notes || '');

  const [member] = await sequelize.query(
    'SELECT id, status FROM members WHERE id = ?',
    { replacements: [member_id] }
  );

  if (member.length === 0) throw new Error('Member not found.');
  if (member[0].status !== 'ACTIVE') throw new Error('Member is not active.');

  const [savingId] = await sequelize.query(
    'INSERT INTO savings (member_id, recorded_by, amount, transaction_type, notes) VALUES (?, ?, ?, ?, ?)',
    {
      replacements: [
        member_id,
        Number(adminId),
        amount,
        transaction_type,
        notes
      ]
    }
  );

  if (!savingId) {
    throw new Error('Failed to get inserted savings ID.');
  }

  await sequelize.query(
    'INSERT INTO audit_logs (performed_by_admin, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
    {
      replacements: [
        Number(adminId),
        'SAVINGS_RECORDED',
        'savings',
        savingId,
        transaction_type + ' of KES ' + amount + ' for member ID ' + member_id
      ]
    }
  );

  const [saving] = await sequelize.query(
    `SELECT s.id, s.amount, s.transaction_type, s.notes, s.recorded_at,
            m.full_name as member_name, m.member_number
     FROM savings s
     JOIN members m ON m.id = s.member_id
     WHERE s.id = ?`,
    { replacements: [savingId] }
  );

  return saving[0];
};

const getMemberSavingsBalance = async (memberId) => {
  const [result] = await sequelize.query(
    `SELECT
       COALESCE(SUM(CASE WHEN transaction_type IN ('DEPOSIT', 'INTEREST', 'PROFIT_SHARE') THEN amount ELSE 0 END), 0) as total_in,
       COALESCE(SUM(CASE WHEN transaction_type = 'WITHDRAWAL' THEN amount ELSE 0 END), 0) as total_out
     FROM savings
     WHERE member_id = ?`,
    { replacements: [Number(memberId)] }
  );

  return parseFloat(result[0].total_in) - parseFloat(result[0].total_out);
};

const getMemberSavingsHistory = async (memberId) => {
  const [savings] = await sequelize.query(
    `SELECT s.id, s.amount, s.transaction_type, s.notes, s.recorded_at,
            m.full_name as member_name, m.member_number
     FROM savings s
     JOIN members m ON m.id = s.member_id
     WHERE s.member_id = ?
     ORDER BY s.recorded_at DESC`,
    { replacements: [Number(memberId)] }
  );

  return savings;
};

const requestWithdrawal = async (input, memberId) => {
  const amount = Number(input.amount);
  const reason = String(input.reason || '');

  const balance = await getMemberSavingsBalance(memberId);

  if (amount > balance) {
    throw new Error('Insufficient savings balance. Available: KES ' + balance);
  }

  const [withdrawalId] = await sequelize.query(
    'INSERT INTO savings_withdrawals (member_id, amount, reason) VALUES (?, ?, ?)',
    { replacements: [Number(memberId), amount, reason] }
  );

  if (!withdrawalId) {
    throw new Error('Failed to get inserted withdrawal ID.');
  }

  const [withdrawal] = await sequelize.query(
    'SELECT id, amount, reason, status, requested_at FROM savings_withdrawals WHERE id = ?',
    { replacements: [withdrawalId] }
  );

  return withdrawal[0];
};

const approveWithdrawal = async (withdrawalId, adminId) => {
  const [existing] = await sequelize.query(
    'SELECT id, member_id, amount, status FROM savings_withdrawals WHERE id = ?',
    { replacements: [Number(withdrawalId)] }
  );

  if (existing.length === 0) throw new Error('Withdrawal request not found.');
  if (existing[0].status !== 'PENDING') throw new Error('This withdrawal has already been processed.');

  const withdrawal = existing[0];

  await sequelize.query(
    "UPDATE savings_withdrawals SET status = 'APPROVED', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?",
    { replacements: [Number(adminId), Number(withdrawalId)] }
  );

  await sequelize.query(
    'INSERT INTO savings (member_id, recorded_by, amount, transaction_type, notes) VALUES (?, ?, ?, ?, ?)',
    {
      replacements: [
        withdrawal.member_id,
        Number(adminId),
        withdrawal.amount,
        'WITHDRAWAL',
        'Withdrawal request ID ' + withdrawalId + ' approved'
      ]
    }
  );

  await sequelize.query(
    'INSERT INTO audit_logs (performed_by_admin, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
    {
      replacements: [
        Number(adminId),
        'WITHDRAWAL_APPROVED',
        'savings_withdrawals',
        Number(withdrawalId),
        'Withdrawal of KES ' + withdrawal.amount + ' approved for member ID ' + withdrawal.member_id
      ]
    }
  );

  const [updated] = await sequelize.query(
    'SELECT id, amount, reason, status, requested_at, reviewed_at FROM savings_withdrawals WHERE id = ?',
    { replacements: [Number(withdrawalId)] }
  );

  return updated[0];
};

const getPendingWithdrawals = async () => {
  const [withdrawals] = await sequelize.query(
    `SELECT sw.id, sw.amount, sw.reason, sw.status, sw.requested_at,
            m.full_name as member_name, m.member_number
     FROM savings_withdrawals sw
     JOIN members m ON m.id = sw.member_id
     WHERE sw.status = ?
     ORDER BY sw.requested_at ASC`,
    { replacements: ['PENDING'] }
  );

  return withdrawals;
};

module.exports = {
  recordSavings,
  getMemberSavingsBalance,
  getMemberSavingsHistory,
  requestWithdrawal,
  approveWithdrawal,
  getPendingWithdrawals
};