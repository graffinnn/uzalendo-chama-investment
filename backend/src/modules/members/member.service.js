const sequelize = require('../../config/database');

const getAllMembers = async () => {
  const [members] = await sequelize.query(
    `SELECT m.id, m.full_name, m.phone, m.national_id, m.member_number,
            m.status, m.loan_limit, m.joined_at,
            ms.overall_score
     FROM members m
     LEFT JOIN member_scores ms ON ms.member_id = m.id
     ORDER BY m.member_number ASC`
  );
  return members;
};

const getMemberById = async (id) => {
  const [rows] = await sequelize.query(
    `SELECT m.id, m.full_name, m.phone, m.national_id, m.member_number,
            m.status, m.loan_limit, m.joined_at,
            ms.overall_score, ms.contribution_score, ms.loan_score
     FROM members m
     LEFT JOIN member_scores ms ON ms.member_id = m.id
     WHERE m.id = ?`,
    { replacements: [id] }
  );
  if (rows.length === 0) throw new Error('Member not found.');
  return rows[0];
};

const activateMember = async (memberId, adminId) => {
  const [existing] = await sequelize.query(
    'SELECT id, status FROM members WHERE id = ?',
    { replacements: [memberId] }
  );
  if (existing.length === 0) throw new Error('Member not found.');
  if (existing[0].status === 'ACTIVE') throw new Error('Member is already active.');

  await sequelize.query(
    "UPDATE members SET status = 'ACTIVE' WHERE id = ?",
    { replacements: [memberId] }
  );

  await sequelize.query(
    'INSERT INTO audit_logs (performed_by_admin, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
    { replacements: [adminId, 'MEMBER_ACTIVATED', 'members', memberId, `Member ID ${memberId} activated by admin ID ${adminId}`] }
  );

  return getMemberById(memberId);
};

const deactivateMember = async (memberId, adminId) => {
  const [existing] = await sequelize.query(
    'SELECT id, status FROM members WHERE id = ?',
    { replacements: [memberId] }
  );
  if (existing.length === 0) throw new Error('Member not found.');
  if (existing[0].status === 'INACTIVE') throw new Error('Member is already inactive.');

  await sequelize.query(
    "UPDATE members SET status = 'INACTIVE' WHERE id = ?",
    { replacements: [memberId] }
  );

  await sequelize.query(
    'INSERT INTO audit_logs (performed_by_admin, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
    { replacements: [adminId, 'MEMBER_DEACTIVATED', 'members', memberId, `Member ID ${memberId} deactivated by admin ID ${adminId}`] }
  );

  return getMemberById(memberId);
};

module.exports = { getAllMembers, getMemberById, activateMember, deactivateMember };