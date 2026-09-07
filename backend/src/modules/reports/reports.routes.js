const express = require('express');
const { getAuthUser } = require('../../middleware/authMiddleware');
const {
  getMemberProfile,
  getMemberSavingsBalance,
  getMemberSavingsHistory,
  getMyLoans,
  getAllLoans,
  getMemberContributions,
  getAllContributions,
  getCycleHistory
} = require('./reports.service');
const { startPdf, addHeader, addFooter, addTable, addSectionTitle, addSummaryLine } = require('./reports.pdf');

const router = express.Router();

const requireAuth = (req, res, next) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  req.user = user;
  next();
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required.' });
  next();
};

const money = (n) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
const dateStr = (d) => (d ? new Date(d).toLocaleDateString('en-KE') : '—');

// 1. Member: savings statement
router.get('/savings-statement', requireAuth, async (req, res) => {
  try {
    const member = await getMemberProfile(req.user.id);
    const balance = await getMemberSavingsBalance(req.user.id);
    const history = await getMemberSavingsHistory(req.user.id);

    const doc = startPdf(res, `savings-statement-${member.member_number}.pdf`);
    addHeader(doc, 'Savings Statement', `${member.full_name} (${member.member_number})`);
    addTable(doc, {
      headers: ['Date', 'Type', 'Amount', 'Notes'],
      rows: history.map((h) => [dateStr(h.recorded_at), h.transaction_type, money(h.amount), h.notes || '—']),
      columnWidths: [90, 90, 100, 235]
    });
    addSummaryLine(doc, 'Current Balance', money(balance));
    addFooter(doc);
    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Member: loan history
router.get('/loan-history', requireAuth, async (req, res) => {
  try {
    const member = await getMemberProfile(req.user.id);
    const loans = await getMyLoans(req.user.id);

    const doc = startPdf(res, `loan-history-${member.member_number}.pdf`);
    addHeader(doc, 'Loan History', `${member.full_name} (${member.member_number})`);
    addTable(doc, {
      headers: ['Applied', 'Amount', 'Period', 'Rate', 'Status'],
      rows: loans.map((l) => [
        dateStr(l.applied_at),
        money(l.amount),
        `${l.repayment_period_months} mo`,
        `${l.interest_rate}%`,
        l.status
      ]),
      columnWidths: [90, 100, 80, 70, 175]
    });
    addFooter(doc);
    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Member: contribution history
router.get('/contribution-history', requireAuth, async (req, res) => {
  try {
    const member = await getMemberProfile(req.user.id);
    const contributions = await getMemberContributions(req.user.id);
    const total = contributions.reduce((sum, c) => sum + Number(c.amount), 0);

    const doc = startPdf(res, `contribution-history-${member.member_number}.pdf`);
    addHeader(doc, 'Contribution History', `${member.full_name} (${member.member_number})`);
    addTable(doc, {
      headers: ['Month', 'Year', 'Amount', 'Recorded'],
      rows: contributions.map((c) => [c.contribution_month, c.contribution_year, money(c.amount), dateStr(c.recorded_at)]),
      columnWidths: [110, 90, 120, 195]
    });
    addSummaryLine(doc, 'Total Contributed', money(total));
    addFooter(doc);
    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Admin: full member statement
router.get('/member-statement/:memberId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const memberId = Number(req.params.memberId);
    const member = await getMemberProfile(memberId);
    const balance = await getMemberSavingsBalance(memberId);
    const savingsHistory = await getMemberSavingsHistory(memberId);
    const loans = await getMyLoans(memberId);
    const contributions = await getMemberContributions(memberId);
    const totalContributed = contributions.reduce((s, c) => s + Number(c.amount), 0);

    const doc = startPdf(res, `member-statement-${member.member_number}.pdf`);
    addHeader(doc, 'Full Member Statement', `${member.full_name} (${member.member_number})`);

    addSectionTitle(doc, 'Savings');
    addTable(doc, {
      headers: ['Date', 'Type', 'Amount', 'Notes'],
      rows: savingsHistory.map((h) => [dateStr(h.recorded_at), h.transaction_type, money(h.amount), h.notes || '—']),
      columnWidths: [90, 90, 100, 235]
    });
    addSummaryLine(doc, 'Savings Balance', money(balance));

    doc.moveDown(1);
    addSectionTitle(doc, 'Loans');
    addTable(doc, {
      headers: ['Applied', 'Amount', 'Period', 'Rate', 'Status'],
      rows: loans.map((l) => [
        dateStr(l.applied_at),
        money(l.amount),
        `${l.repayment_period_months} mo`,
        `${l.interest_rate}%`,
        l.status
      ]),
      columnWidths: [90, 100, 80, 70, 175]
    });

    doc.moveDown(1);
    addSectionTitle(doc, 'Contributions');
    addTable(doc, {
      headers: ['Month', 'Year', 'Amount', 'Recorded'],
      rows: contributions.map((c) => [c.contribution_month, c.contribution_year, money(c.amount), dateStr(c.recorded_at)]),
      columnWidths: [110, 90, 120, 195]
    });
    addSummaryLine(doc, 'Total Contributed', money(totalContributed));

    addFooter(doc);
    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Admin: cycle report
router.get('/cycle-report', requireAuth, requireAdmin, async (req, res) => {
  try {
    const cycles = await getCycleHistory();

    const doc = startPdf(res, `cycle-report-${Date.now()}.pdf`);
    addHeader(doc, 'Merry-Go-Round Cycle Report');

    if (cycles.length === 0) {
      doc.fillColor('#666666').fontSize(11).text('No cycles found.', 40, doc.y + 10);
    }

    cycles.forEach((cycle, idx) => {
      if (idx > 0) doc.moveDown(1.5);
      addSectionTitle(
        doc,
        `Cycle #${cycle.id} — ${cycle.status} — Payout ${money(cycle.payout_amount)} — Started ${dateStr(cycle.start_date)}`
      );
      addTable(doc, {
        headers: ['Pos', 'Member', 'Expected Payout', 'Actual Payout', 'Status'],
        rows: cycle.positions.map((p) => [
          p.position_number,
          `${p.member_name} (${p.member_number})`,
          dateStr(p.expected_payout_date),
          dateStr(p.actual_payout_date),
          p.status
        ]),
        columnWidths: [40, 190, 100, 100, 85]
      });
    });

    addFooter(doc);
    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Admin: loan portfolio (all members)
router.get('/loan-portfolio', requireAuth, requireAdmin, async (req, res) => {
  try {
    const loans = await getAllLoans();
    const totalOutstanding = loans
      .filter((l) => l.status === 'APPROVED')
      .reduce((sum, l) => sum + Number(l.amount), 0);

    const doc = startPdf(res, `loan-portfolio-${Date.now()}.pdf`);
    addHeader(doc, 'Loan Portfolio Report — All Members');
    addTable(doc, {
      headers: ['Member', 'Amount', 'Period', 'Rate', 'Status', 'Applied'],
      rows: loans.map((l) => [
        `${l.member_name} (${l.member_number})`,
        money(l.amount),
        `${l.repayment_period_months} mo`,
        `${l.interest_rate}%`,
        l.status,
        dateStr(l.applied_at)
      ]),
      columnWidths: [150, 90, 65, 55, 80, 75]
    });
    addSummaryLine(doc, 'Total Outstanding (Approved Loans)', money(totalOutstanding));
    addFooter(doc);
    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;