const sequelize = require('../../config/database');

const query = async (sql, params = []) => {
  const [results] = await sequelize.query(sql, {
    replacements: params,
    type: sequelize.constructor.QueryTypes.RAW
  });
  return results;
};

const applyForLoan = async (input, memberId) => {
  const amount = Number(input.amount);
  const period = Number(input.repayment_period_months);
  const reason = input.reason;

  const members = await query(
    'SELECT id, status FROM members WHERE id = ?',
    [memberId]
  );
  if (!members || members.length === 0) throw new Error('Member not found.');
  if (members[0].status !== 'ACTIVE') throw new Error('Your account is not active.');

  const scores = await query(
    'SELECT overall_score FROM member_scores WHERE member_id = ?',
    [memberId]
  );
  const score = scores && scores.length > 0 ? parseFloat(scores[0].overall_score) : 50;
  if (score < 60) throw new Error(`Your member score (${score}) is below the minimum required score of 60 to apply for a loan.`);

  const cycleCheck = await query(
    "SELECT cp.id FROM cycle_positions cp JOIN cycles c ON c.id = cp.cycle_id WHERE cp.member_id = ? AND c.status = 'ACTIVE'",
    [memberId]
  );
  if (!cycleCheck || cycleCheck.length === 0) {
    throw new Error('You must be part of an active cycle before applying for a loan.');
  }

  const activeLoans = await query(
    "SELECT id FROM loans WHERE member_id = ? AND status IN ('PENDING', 'APPROVED')",
    [memberId]
  );
  if (activeLoans && activeLoans.length > 0) {
    throw new Error('You already have an active or pending loan.');
  }

  const insertResult = await query(
    'INSERT INTO loans SET member_id = ?, amount = ?, reason = ?, repayment_period_months = ?, interest_rate = 10.00',
    [memberId, amount, reason, period]
  );

  await query(
    'INSERT INTO audit_logs SET performed_by_member = ?, action = ?, target_table = ?, target_id = ?, details = ?',
    [memberId, 'LOAN_APPLIED', 'loans', insertResult.insertId, `Loan application of KES ${amount} for ${period} months`]
  );

  const loans = await query(
    'SELECT id, amount, reason, repayment_period_months, interest_rate, status, applied_at FROM loans WHERE id = ?',
    [insertResult.insertId]
  );

  return loans[0];
};

const approveLoan = async (loanId, adminId) => {
  const loans = await query(
    'SELECT id, member_id, amount, repayment_period_months, interest_rate, status FROM loans WHERE id = ?',
    [Number(loanId)]
  );
  if (!loans || loans.length === 0) throw new Error('Loan not found.');
  if (loans[0].status !== 'PENDING') throw new Error('Only pending loans can be approved.');

  const loan = loans[0];

  await query(
    "UPDATE loans SET status = 'APPROVED', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?",
    [Number(adminId), Number(loanId)]
  );

  const monthlyInterest = (loan.amount * loan.interest_rate) / 100;
  const monthlyPayment = (loan.amount / loan.repayment_period_months) + monthlyInterest;

  for (let i = 1; i <= loan.repayment_period_months; i++) {
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + i);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    await query(
      'INSERT INTO loan_repayments SET loan_id = ?, recorded_by = ?, amount = ?, due_date = ?',
      [Number(loanId), Number(adminId), monthlyPayment.toFixed(2), dueDateStr]
    );
  }

  await query(
    'INSERT INTO audit_logs SET performed_by_admin = ?, action = ?, target_table = ?, target_id = ?, details = ?',
    [Number(adminId), 'LOAN_APPROVED', 'loans', Number(loanId), `Loan ID ${loanId} approved. Monthly payment: KES ${monthlyPayment.toFixed(2)}`]
  );

  return getLoanById(loanId);
};

const rejectLoan = async (loanId, adminId) => {
  const loans = await query(
    'SELECT id, status FROM loans WHERE id = ?',
    [Number(loanId)]
  );
  if (!loans || loans.length === 0) throw new Error('Loan not found.');
  if (loans[0].status !== 'PENDING') throw new Error('Only pending loans can be rejected.');

  await query(
    "UPDATE loans SET status = 'REJECTED', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?",
    [Number(adminId), Number(loanId)]
  );

  await query(
    'INSERT INTO audit_logs SET performed_by_admin = ?, action = ?, target_table = ?, target_id = ?, details = ?',
    [Number(adminId), 'LOAN_REJECTED', 'loans', Number(loanId), `Loan ID ${loanId} rejected`]
  );

  return getLoanById(loanId);
};

const recordRepayment = async (repaymentId, adminId) => {
  const repayments = await query(
    'SELECT id, loan_id, amount, status FROM loan_repayments WHERE id = ?',
    [Number(repaymentId)]
  );
  if (!repayments || repayments.length === 0) throw new Error('Repayment record not found.');
  if (repayments[0].status === 'PAID') throw new Error('This repayment has already been recorded.');

  const repayment = repayments[0];

  await query(
    "UPDATE loan_repayments SET status = 'PAID', paid_date = CURDATE(), recorded_by = ? WHERE id = ?",
    [Number(adminId), Number(repaymentId)]
  );

  const remaining = await query(
    "SELECT COUNT(*) as unpaid FROM loan_repayments WHERE loan_id = ? AND status != 'PAID'",
    [repayment.loan_id]
  );

  if (remaining[0].unpaid === 0) {
    await query(
      "UPDATE loans SET status = 'FULLY_PAID' WHERE id = ?",
      [repayment.loan_id]
    );
  }

  await updateLoanScore(repayment.loan_id);

  const updated = await query(
    'SELECT id, amount, due_date, paid_date, status FROM loan_repayments WHERE id = ?',
    [Number(repaymentId)]
  );

  return updated[0];
};

const updateLoanScore = async (loanId) => {
  const loans = await query(
    'SELECT member_id FROM loans WHERE id = ?',
    [Number(loanId)]
  );
  if (!loans || loans.length === 0) return;

  const memberId = loans[0].member_id;

  const repayments = await query(
    "SELECT status FROM loan_repayments lr JOIN loans l ON l.id = lr.loan_id WHERE l.member_id = ?",
    [memberId]
  );

  if (!repayments || repayments.length === 0) return;

  const paid = repayments.filter(r => r.status === 'PAID').length;
  const total = repayments.length;
  const loanScore = Math.round((paid / total) * 100);

  await query(
    "UPDATE member_scores SET loan_score = ?, overall_score = ROUND((contribution_score * 0.6) + (? * 0.4), 2) WHERE member_id = ?",
    [loanScore, loanScore, memberId]
  );
};

const getLoanById = async (loanId) => {
  const loans = await query(
    'SELECT l.id, l.amount, l.reason, l.repayment_period_months, l.interest_rate, l.status, l.applied_at, l.reviewed_at, m.full_name as member_name, m.member_number FROM loans l JOIN members m ON m.id = l.member_id WHERE l.id = ?',
    [Number(loanId)]
  );
  if (!loans || loans.length === 0) throw new Error('Loan not found.');

  const loan = loans[0];
  const repayments = await query(
    'SELECT id, amount, due_date, paid_date, status FROM loan_repayments WHERE loan_id = ? ORDER BY due_date ASC',
    [Number(loanId)]
  );
  loan.repayment_schedule = repayments || [];
  return loan;
};

const getMyLoans = async (memberId) => {
  const loans = await query(
    'SELECT l.id, l.amount, l.reason, l.repayment_period_months, l.interest_rate, l.status, l.applied_at FROM loans l WHERE l.member_id = ? ORDER BY l.applied_at DESC',
    [memberId]
  );
  return loans || [];
};

const getAllLoans = async () => {
  const loans = await query(
    'SELECT l.id, l.amount, l.reason, l.repayment_period_months, l.interest_rate, l.status, l.applied_at, m.full_name as member_name, m.member_number FROM loans l JOIN members m ON m.id = l.member_id ORDER BY l.applied_at DESC'
  );
  return loans || [];
};

const getOverdueLoans = async () => {
  await query(
    "UPDATE loan_repayments SET status = 'OVERDUE' WHERE due_date < CURDATE() AND status = 'PENDING'"
  );

  const overdue = await query(
    "SELECT lr.id, lr.amount, lr.due_date, lr.status, m.full_name as member_name, m.member_number, l.id as loan_id FROM loan_repayments lr JOIN loans l ON l.id = lr.loan_id JOIN members m ON m.id = l.member_id WHERE lr.status = 'OVERDUE' ORDER BY lr.due_date ASC"
  );
  return overdue || [];
};

module.exports = { applyForLoan, approveLoan, rejectLoan, recordRepayment, getLoanById, getMyLoans, getAllLoans, getOverdueLoans };