const sequelize = require('../../config/database');
const { recalculateContributionScore } = require('../scores/score.service');

const query = async (sql, params = []) => {
  const [results] = await sequelize.query(sql, {
    replacements: params,
    type: sequelize.constructor.QueryTypes.RAW
  });
  return results;
};

// Dedicated helper for INSERTs. Sequelize needs QueryTypes.INSERT (not RAW)
// to correctly return the new row's auto-increment ID. Using RAW for inserts
// is what caused the "replacements[3] is undefined" error and the silent
// duplicate-insert issue.
const insert = async (sql, params = []) => {
  const [insertId] = await sequelize.query(sql, {
    replacements: params,
    type: sequelize.constructor.QueryTypes.INSERT
  });
  return insertId;
};

const recordContribution = async (input, adminId) => {
  const member_id = Number(input.member_id);
  const amount = Number(input.amount);
  const contribution_month = Number(input.contribution_month);
  const contribution_year = Number(input.contribution_year);

  const members = await query(
    'SELECT id, status FROM members WHERE id = ?',
    [member_id]
  );
  if (!members || members.length === 0) throw new Error('Member not found.');
  if (members[0].status !== 'ACTIVE') throw new Error('Member is not active.');

  const existing = await query(
    'SELECT id FROM contributions WHERE member_id = ? AND contribution_month = ? AND contribution_year = ?',
    [member_id, contribution_month, contribution_year]
  );
  if (existing && existing.length > 0) {
    throw new Error('Contribution already recorded for this member this month.');
  }

  const contributionId = await insert(
    'INSERT INTO contributions SET member_id = ?, recorded_by = ?, amount = ?, contribution_month = ?, contribution_year = ?',
    [member_id, Number(adminId), amount, contribution_month, contribution_year]
  );

  await insert(
    'INSERT INTO audit_logs SET performed_by_admin = ?, action = ?, target_table = ?, target_id = ?, details = ?',
    [Number(adminId), 'CONTRIBUTION_RECORDED', 'contributions', contributionId, `KES ${amount} recorded for member ID ${member_id} - ${contribution_month}/${contribution_year}`]
  );

  const scoreResult = await recalculateContributionScore(member_id, `Contribution recorded for ${contribution_month}/${contribution_year}`);
  console.log('SCORE RECALCULATED:', scoreResult);

  const contributions = await query(
    `SELECT c.id, c.amount, c.contribution_month, c.contribution_year, c.recorded_at,
            m.full_name as member_name, m.member_number
     FROM contributions c
     JOIN members m ON m.id = c.member_id
     WHERE c.id = ?`,
    [contributionId]
  );

  return contributions[0];
};

const getMemberContributions = async (memberId) => {
  return query(
    `SELECT c.id, c.amount, c.contribution_month, c.contribution_year, c.recorded_at,
            m.full_name as member_name, m.member_number
     FROM contributions c
     JOIN members m ON m.id = c.member_id
     WHERE c.member_id = ?
     ORDER BY c.contribution_year DESC, c.contribution_month DESC`,
    [Number(memberId)]
  );
};

const getPoolTotal = async () => {
  const result = await query('SELECT COALESCE(SUM(amount), 0) as total FROM contributions');
  return result[0].total;
};

const getAllContributions = async () => {
  return query(
    `SELECT c.id, c.amount, c.contribution_month, c.contribution_year, c.recorded_at,
            m.full_name as member_name, m.member_number
     FROM contributions c
     JOIN members m ON m.id = c.member_id
     ORDER BY c.recorded_at DESC`
  );
};

module.exports = { recordContribution, getMemberContributions, getPoolTotal, getAllContributions };