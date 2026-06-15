const sequelize = require('../../config/database');
const { hashPassword, verifyPassword } = require('../../utils/hashPassword');
const { generateToken } = require('../../utils/generateToken');

const registerAdmin = async (input) => {
  const { full_name, email, phone, password } = input;

  const [existing] = await sequelize.query(
    'SELECT id FROM admins WHERE email = ? OR phone = ?',
    { replacements: [email, phone] }
  );

  if (existing.length > 0) {
    throw new Error('An admin with this email or phone already exists.');
  }

  const [chama] = await sequelize.query('SELECT id FROM chamas LIMIT 1');

  if (chama.length === 0) {
    throw new Error('No Chama found. Please seed the database first.');
  }

  const password_hash = await hashPassword(password);

  const [insertResult] = await sequelize.query(
    'INSERT INTO admins (chama_id, full_name, email, phone, password_hash) VALUES (?, ?, ?, ?, ?)',
    { replacements: [chama[0].id, full_name, email, phone, password_hash] }
  );

  const [admin] = await sequelize.query(
    'SELECT id, full_name, email, phone, created_at FROM admins WHERE id = ?',
    { replacements: [insertResult.insertId] }
  );

  return admin[0];
};

const loginAdmin = async (email, password) => {
  const [rows] = await sequelize.query(
    'SELECT * FROM admins WHERE email = ?',
    { replacements: [email] }
  );

  if (rows.length === 0) {
    throw new Error('Invalid credentials.');
  }

  const admin = rows[0];
  const valid = await verifyPassword(password, admin.password_hash);

  if (!valid) {
    throw new Error('Invalid credentials.');
  }

  const token = generateToken({ id: admin.id, role: 'ADMIN' });

  return {
    token,
    admin: {
      id: admin.id,
      full_name: admin.full_name,
      email: admin.email,
      phone: admin.phone
    }
  };
};

const registerMember = async (input) => {
  const { full_name, phone, national_id, password } = input;

  const [existing] = await sequelize.query(
    'SELECT id FROM members WHERE phone = ? OR national_id = ?',
    { replacements: [phone, national_id] }
  );

  if (existing.length > 0) {
    throw new Error('A member with this phone or national ID already exists.');
  }

  const [chama] = await sequelize.query('SELECT id FROM chamas LIMIT 1');

  if (chama.length === 0) {
    throw new Error('No Chama found. Please seed the database first.');
  }

  const [countResult] = await sequelize.query(
    'SELECT COUNT(*) AS total FROM members WHERE chama_id = ?',
    { replacements: [chama[0].id] }
  );

  const count = Number(countResult[0].total) + 1;
  const member_number = `UZA${String(count).padStart(3, '0')}`;
  const password_hash = await hashPassword(password);

  const [insertResult] = await sequelize.query(
    'INSERT INTO members (chama_id, full_name, phone, national_id, member_number, password_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    { replacements: [chama[0].id, full_name, phone, national_id, member_number, password_hash, 'PENDING'] }
  );

  const memberId = insertResult.insertId;

  await sequelize.query(
    'INSERT INTO member_scores (member_id) VALUES (?)',
    { replacements: [memberId] }
  );

  await sequelize.query(
    'INSERT INTO audit_logs (performed_by_member, action, target_table, target_id, details) VALUES (?, ?, ?, ?, ?)',
    { replacements: [memberId, 'MEMBER_REGISTERED', 'members', memberId, `Member ${member_number} registered and pending activation`] }
  );

  const [member] = await sequelize.query(
    'SELECT id, full_name, phone, national_id, member_number, status, joined_at FROM members WHERE id = ?',
    { replacements: [memberId] }
  );

  return member[0];
};

const loginMember = async (phone, password) => {
  const [rows] = await sequelize.query(
    'SELECT * FROM members WHERE phone = ?',
    { replacements: [phone] }
  );

  if (rows.length === 0) {
    throw new Error('Invalid credentials.');
  }

  const member = rows[0];

  if (member.status === 'PENDING') {
    throw new Error('Your account is pending activation. Please contact the Treasurer.');
  }

  if (member.status === 'INACTIVE') {
    throw new Error('Your account has been deactivated. Please contact the Treasurer.');
  }

  const valid = await verifyPassword(password, member.password_hash);

  if (!valid) {
    throw new Error('Invalid credentials.');
  }

  const token = generateToken({ id: member.id, role: 'MEMBER' });

  return {
    token,
    member: {
      id: member.id,
      full_name: member.full_name,
      phone: member.phone,
      member_number: member.member_number,
      status: member.status
    }
  };
};

module.exports = { registerAdmin, loginAdmin, registerMember, loginMember };