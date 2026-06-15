const sequelize = require('../../config/database');

const recordContribution = async (input, adminId) => {
  const { member_id, amount, contribution_month, contribution_year } = input;

  const [member] = await sequelize.query(
    "SELECT id, status FROM members WHERE id = ?",
    { replacements: [member_id] }
  );

  if (member.length === 0) throw new Error('Member not found.');
  if (member[0].status !== 'ACTIVE') throw new Error('Member is not active.');

  const [existing] = await sequelize.query(
    'SELECT id FROM contributions WHERE member_id = ? AND contribution_month = ? AND contribution_year = ?',
    { replacements: [member_id, contribution_month, contribution_year] }
  );

  if (existing.length > 0) {
    throw new Error('Contribution already recorded for this member this month.');
  }

  const [result] = await sequelize.query(
    'INSERT INTO contributions (member_id, recorded_by, amount, contribution_month, contribution_year) VALUES (?, ?, ?, ?, ?)',
    { replacements: [member_id, adminId, amount, contribution_month, contribution_year] }
  );

  await sequelize.query(
    'INSERT INTO audit_logs (performed_by_admin, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
    { replacements: [adminId, 'CONTRIBUTION_RECORDED', 'contributions', result.insertId, `KES ${amount} recorded for member ID ${member_id} - ${contribution_month}/${contribution_year}`] }
  );

  await updateContributionScore(member_id);

  const [contribution] = await sequelize.query(
    `SELECT c.id, c.amount, c.contribution_month, c.contribution_year, c.recorded_at,
            m.full_name as member_name, m.member_number
     FROM contributions c
     JOIN members m ON m.id = c.member_id
     WHERE c.id = ?`,
    { replacements: [result.insertId] }
  );

  return contribution[0];
};

const updateContributionScore = async (memberId) => {
  const [countResult] = await sequelize.query(
    'SELECT COUNT(*) as total FROM contributions WHERE member_id = ?',
    { replacements: [memberId] }
  );

  const total = countResult[0].total;
  const score = total > 0 ? Math.min(100, 50 + (total * 5)) : 50;

  await sequelize.query(
    `UPDATE member_scores
     SET contribution_score = ?,
         overall_score = ROUND((? * 0.6) + (loan_score * 0.4), 2)
     WHERE member_id = ?`,
    { replacements: [score, score, memberId] }
  );
};

const getMemberContributions = async (memberId) => {
  const [contributions] = await sequelize.query(
    `SELECT c.id, c.amount, c.contribution_month, c.contribution_year, c.recorded_at,
            m.full_name as member_name, m.member_number
     FROM contributions c
     JOIN members m ON m.id = c.member_id
     WHERE c.member_id = ?
     ORDER BY c.contribution_year DESC, c.contribution_month DESC`,
    { replacements: [memberId] }
  );
  return contributions;
};

const getPoolTotal = async () => {
  const [result] = await sequelize.query(
    'SELECT COALESCE(SUM(amount), 0) as total FROM contributions'
  );
  return result[0].total;
};

const getAllContributions = async () => {
  const [contributions] = await sequelize.query(
    `SELECT c.id, c.amount, c.contribution_month, c.contribution_year, c.recorded_at,
            m.full_name as member_name, m.member_number
     FROM contributions c
     JOIN members m ON m.id = c.member_id
     ORDER BY c.recorded_at DESC`
  );
  return contributions;
};

module.exports = { recordContribution, getMemberContributions, getPoolTotal, getAllContributions };