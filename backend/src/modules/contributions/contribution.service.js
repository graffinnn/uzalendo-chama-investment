const sequelize = require('../../config/database');
const { recalculateContributionScore } = require('../scores/score.service');
const { QueryTypes } = require('sequelize');

const recordContribution = async (input, actorId, isSelfRecorded = false) => {
  const { member_id, amount, contribution_month, contribution_year } = input;

  const member = await sequelize.query(
    "SELECT id, status FROM members WHERE id = ?",
    { replacements: [member_id], type: QueryTypes.SELECT }
  );

  if (member.length === 0) throw new Error('Member not found.');
  if (member[0].status !== 'ACTIVE') throw new Error('Member is not active.');

  const existing = await sequelize.query(
    'SELECT id FROM contributions WHERE member_id = ? AND contribution_month = ? AND contribution_year = ?',
    { replacements: [member_id, contribution_month, contribution_year], type: QueryTypes.SELECT }
  );

  if (existing.length > 0) {
    throw new Error('Contribution already recorded for this member this month.');
  }

  let contributionId;
  if (isSelfRecorded) {
    [contributionId] = await sequelize.query(
      'INSERT INTO contributions SET member_id = ?, recorded_by = NULL, amount = ?, contribution_month = ?, contribution_year = ?',
      {
        replacements: [Number(member_id), Number(amount), Number(contribution_month), Number(contribution_year)],
        type: QueryTypes.INSERT
      }
    );
  } else {
    [contributionId] = await sequelize.query(
      'INSERT INTO contributions SET member_id = ?, recorded_by = ?, amount = ?, contribution_month = ?, contribution_year = ?',
      {
        replacements: [Number(member_id), actorId, Number(amount), Number(contribution_month), Number(contribution_year)],
        type: QueryTypes.INSERT
      }
    );
  }

  const auditDetails = isSelfRecorded
    ? `KES ${amount} self-recorded by member for ${contribution_month}/${contribution_year}`
    : `KES ${amount} recorded for member ID ${member_id} - ${contribution_month}/${contribution_year}`;

  if (isSelfRecorded) {
    await sequelize.query(
      'INSERT INTO audit_logs SET performed_by_member = ?, action = ?, target_table = ?, target_id = ?, details = ?',
      { replacements: [actorId, 'CONTRIBUTION_SELF_RECORDED', 'contributions', contributionId, auditDetails], type: QueryTypes.INSERT }
    );
  } else {
    await sequelize.query(
      'INSERT INTO audit_logs SET performed_by_admin = ?, action = ?, target_table = ?, target_id = ?, details = ?',
      { replacements: [actorId, 'CONTRIBUTION_RECORDED', 'contributions', contributionId, auditDetails], type: QueryTypes.INSERT }
    );
  }

  await recalculateContributionScore(member_id, auditDetails);

  const contribution = await sequelize.query(
    `SELECT c.id, c.amount, c.contribution_month, c.contribution_year, c.recorded_at,
            m.full_name as member_name, m.member_number
     FROM contributions c
     JOIN members m ON m.id = c.member_id
     WHERE c.id = ?`,
    { replacements: [contributionId], type: QueryTypes.SELECT }
  );

  return contribution[0];
};

const getMemberContributions = async (memberId) => {
  const contributions = await sequelize.query(
    `SELECT c.id, c.amount, c.contribution_month, c.contribution_year, c.recorded_at,
            m.full_name as member_name, m.member_number
     FROM contributions c
     JOIN members m ON m.id = c.member_id
     WHERE c.member_id = ?
     ORDER BY c.contribution_year DESC, c.contribution_month DESC`,
    { replacements: [memberId], type: QueryTypes.SELECT }
  );
  return contributions;
};

const getPoolTotal = async () => {
  const result = await sequelize.query(
    'SELECT COALESCE(SUM(amount), 0) as total FROM contributions',
    { type: QueryTypes.SELECT }
  );
  return result[0].total;
};

const getAllContributions = async () => {
  const contributions = await sequelize.query(
    `SELECT c.id, c.amount, c.contribution_month, c.contribution_year, c.recorded_at,
            m.full_name as member_name, m.member_number
     FROM contributions c
     JOIN members m ON m.id = c.member_id
     ORDER BY c.recorded_at DESC`,
    { type: QueryTypes.SELECT }
  );
  return contributions;
};

module.exports = { recordContribution, getMemberContributions, getPoolTotal, getAllContributions };