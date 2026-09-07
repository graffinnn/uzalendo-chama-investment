const sequelize = require('../../config/database');
const { QueryTypes } = require('sequelize');
const { getMemberSavingsBalance, getMemberSavingsHistory } = require('../savings/savings.service');
const { getMyLoans, getAllLoans } = require('../loans/loan.service');
const { getMemberContributions, getAllContributions } = require('../contributions/contribution.service');
const { getCycleHistory } = require('../cycles/cycle.service');

const getMemberProfile = async (memberId) => {
  const rows = await sequelize.query(
    'SELECT id, full_name, member_number, phone, status, joined_at FROM members WHERE id = ?',
    { replacements: [memberId], type: QueryTypes.SELECT }
  );
  if (rows.length === 0) throw new Error('Member not found.');
  return rows[0];
};

module.exports = {
  getMemberProfile,
  getMemberSavingsBalance,
  getMemberSavingsHistory,
  getMyLoans,
  getAllLoans,
  getMemberContributions,
  getAllContributions,
  getCycleHistory
};