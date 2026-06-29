const sequelize = require('../../config/database');

const query = async (sql, params = []) => {
  const [results] = await sequelize.query(sql, {
    replacements: params,
    type: sequelize.constructor.QueryTypes.RAW
  });
  return results;
};

const insert = async (sql, params = []) => {
  const [insertId] = await sequelize.query(sql, {
    replacements: params,
    type: sequelize.constructor.QueryTypes.INSERT
  });
  return insertId;
};

const WEIGHTS = {
  paymentHistory: 0.40,
  utilization: 0.25,
  contributionConsistency: 0.20,
  tenure: 0.10,
  diversity: 0.05
};

const NEUTRAL_NO_HISTORY_SCORE = 70;
const TENURE_CAP_CYCLES = 12;

const calculatePaymentHistoryScore = async (memberId) => {
  const repayments = await query(
    `SELECT lr.status, lr.due_date, lr.paid_date
     FROM loan_repayments lr
     JOIN loans l ON l.id = lr.loan_id
     WHERE l.member_id = ?`,
    [memberId]
  );

  if (!repayments || repayments.length === 0) {
    return { score: NEUTRAL_NO_HISTORY_SCORE, detail: 'No loan repayment history yet' };
  }

  const now = new Date();
  const due = repayments.filter(r => r.status !== 'PENDING' || new Date(r.due_date) <= now);

  if (due.length === 0) {
    return { score: NEUTRAL_NO_HISTORY_SCORE, detail: 'No repayments due yet' };
  }

  const total = due.length;
  const onTime = due.filter(r => {
    if (r.status !== 'PAID' || !r.paid_date) return false;
    return new Date(r.paid_date) <= new Date(r.due_date);
  }).length;
  const overdue = due.filter(r => r.status === 'OVERDUE').length;

  const onTimeRate = onTime / total;
  let score = Math.round(onTimeRate * 100);
  if (overdue > 0) {
    score = Math.max(0, score - (overdue * 10));
  }

  return { score, detail: `${onTime}/${total} due repayments on time, ${overdue} currently overdue` };
};

const calculateUtilizationScore = async (memberId) => {
  const members = await query(
    'SELECT loan_limit FROM members WHERE id = ?',
    [memberId]
  );
  const loanLimit = members && members[0] ? Number(members[0].loan_limit) : 0;

  const activeLoans = await query(
    `SELECT l.id, l.amount,
            COALESCE(SUM(CASE WHEN lr.status != 'PAID' THEN lr.amount ELSE 0 END), 0) as outstanding
     FROM loans l
     LEFT JOIN loan_repayments lr ON lr.loan_id = l.id
     WHERE l.member_id = ? AND l.status IN ('APPROVED', 'FULLY_PAID')
     GROUP BY l.id`,
    [memberId]
  );

  if (!activeLoans || activeLoans.length === 0 || !loanLimit) {
    return { score: NEUTRAL_NO_HISTORY_SCORE, detail: 'No active loan or loan limit set' };
  }

  const totalOutstanding = activeLoans.reduce((sum, l) => sum + Number(l.outstanding), 0);
  const utilizationRate = Math.min(1, totalOutstanding / loanLimit);
  const score = Math.round((1 - utilizationRate) * 100);

  return { score, detail: `KES ${totalOutstanding.toFixed(2)} outstanding of KES ${loanLimit} limit` };
};

const calculateContributionConsistencyScore = async (memberId) => {
  const members = await query(
    'SELECT joined_at FROM members WHERE id = ?',
    [memberId]
  );
  if (!members || members.length === 0) {
    return { score: NEUTRAL_NO_HISTORY_SCORE, detail: 'Member record not found' };
  }

  const joinedAt = new Date(members[0].joined_at);
  const now = new Date();
  const monthsSinceJoining = Math.max(
    1,
    (now.getFullYear() - joinedAt.getFullYear()) * 12 + (now.getMonth() - joinedAt.getMonth()) + 1
  );

  const contributions = await query(
    'SELECT COUNT(*) as total FROM contributions WHERE member_id = ?',
    [memberId]
  );
  const total = contributions[0] ? Number(contributions[0].total) : 0;

  const consistencyRate = Math.min(1, total / monthsSinceJoining);
  const score = Math.round(consistencyRate * 100);

  return { score, detail: `${total} contributions across ${monthsSinceJoining} months of membership` };
};

const calculateTenureScore = async (memberId) => {
  const result = await query(
    `SELECT COUNT(*) as completed
     FROM cycle_positions cp
     JOIN cycles c ON c.id = cp.cycle_id
     WHERE cp.member_id = ? AND c.status = 'COMPLETED'`,
    [memberId]
  );

  const completed = result[0] ? Number(result[0].completed) : 0;
  const score = Math.round(Math.min(1, completed / TENURE_CAP_CYCLES) * 100);

  return { score, detail: `${completed} completed cycle(s)` };
};

const calculateDiversityScore = async (memberId) => {
  const savings = await query(
    'SELECT COUNT(*) as total FROM savings WHERE member_id = ?',
    [memberId]
  ).catch(() => [{ total: 0 }]);

  const investments = await query(
    'SELECT COUNT(*) as total FROM investments WHERE member_id = ?',
    [memberId]
  ).catch(() => [{ total: 0 }]);

  const hasSavings = savings[0] && Number(savings[0].total) > 0;
  const hasInvestments = investments[0] && Number(investments[0].total) > 0;

  let score = 50;
  if (hasSavings) score += 25;
  if (hasInvestments) score += 25;

  return { score, detail: `Savings: ${hasSavings ? 'yes' : 'no'}, Investments: ${hasInvestments ? 'yes' : 'no'}` };
};

const getMemberScore = async (memberId) => {
  const scores = await query(
    'SELECT member_id, overall_score, contribution_score, loan_score, updated_at FROM member_scores WHERE member_id = ?',
    [Number(memberId)]
  );

  if (!scores || scores.length === 0) {
    return { member_id: memberId, overall_score: NEUTRAL_NO_HISTORY_SCORE, contribution_score: NEUTRAL_NO_HISTORY_SCORE, loan_score: NEUTRAL_NO_HISTORY_SCORE, updated_at: null };
  }

  return scores[0];
};

const getAllMemberScores = async () => {
  return query(
    `SELECT m.id as member_id, m.full_name, m.member_number,
            ms.overall_score, ms.contribution_score, ms.loan_score, ms.updated_at
     FROM members m
     LEFT JOIN member_scores ms ON ms.member_id = m.id
     ORDER BY ms.overall_score DESC`
  );
};

const getScoreHistory = async (memberId) => {
  return query(
    'SELECT id, overall_score, contribution_score, loan_score, reason, recorded_at FROM score_history WHERE member_id = ? ORDER BY recorded_at DESC',
    [Number(memberId)]
  );
};

const persistScore = async (memberId, overall, contribution, loan, reason) => {
  const id = Number(memberId);

  const existing = await query(
    'SELECT id FROM member_scores WHERE member_id = ?',
    [id]
  );

  if (!existing || existing.length === 0) {
    await insert(
      'INSERT INTO member_scores SET member_id = ?, contribution_score = ?, loan_score = ?, overall_score = ?',
      [id, contribution, loan, overall]
    );
  } else {
    await query(
      'UPDATE member_scores SET contribution_score = ?, loan_score = ?, overall_score = ? WHERE member_id = ?',
      [contribution, loan, overall, id]
    );
  }

  await insert(
    'INSERT INTO score_history SET member_id = ?, overall_score = ?, contribution_score = ?, loan_score = ?, reason = ?',
    [id, overall, contribution, loan, reason || 'Score recalculated']
  );
};

const recalculateMemberScore = async (memberId, reason) => {
  const id = Number(memberId);

  const [payment, utilization, consistency, tenure, diversity] = await Promise.all([
    calculatePaymentHistoryScore(id),
    calculateUtilizationScore(id),
    calculateContributionConsistencyScore(id),
    calculateTenureScore(id),
    calculateDiversityScore(id)
  ]);

  const overall = Math.round(
    (payment.score * WEIGHTS.paymentHistory) +
    (utilization.score * WEIGHTS.utilization) +
    (consistency.score * WEIGHTS.contributionConsistency) +
    (tenure.score * WEIGHTS.tenure) +
    (diversity.score * WEIGHTS.diversity)
  );

  const contributionScore = consistency.score;
  const loanScore = Math.round(
    (payment.score * (WEIGHTS.paymentHistory / (WEIGHTS.paymentHistory + WEIGHTS.utilization))) +
    (utilization.score * (WEIGHTS.utilization / (WEIGHTS.paymentHistory + WEIGHTS.utilization)))
  );

  await persistScore(id, overall, contributionScore, loanScore, reason);

  return {
    member_id: id,
    overall_score: overall,
    contribution_score: contributionScore,
    loan_score: loanScore,
    breakdown: {
      payment_history: payment,
      utilization: utilization,
      contribution_consistency: consistency,
      tenure: tenure,
      diversity: diversity
    }
  };
};

const recalculateContributionScore = (memberId, reason) => recalculateMemberScore(memberId, reason);
const recalculateLoanScore = (memberId, reason) => recalculateMemberScore(memberId, reason);

module.exports = {
  getMemberScore,
  getAllMemberScores,
  getScoreHistory,
  recalculateMemberScore,
  recalculateContributionScore,
  recalculateLoanScore
};