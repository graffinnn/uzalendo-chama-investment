const sequelize = require('../../config/database');

const query = async (sql, params = []) => {
  const [results] = await sequelize.query(sql, {
    replacements: params,
    type: sequelize.constructor.QueryTypes.RAW
  });
  return results;
};

const VALID_TYPES = ['SHARES', 'LAND', 'BUSINESS', 'BONDS', 'OTHER'];

const addInvestment = async (input, adminId) => {
  const name = String(input.name);
  const investment_type = String(input.investment_type).toUpperCase();
  const amount_invested = Number(input.amount_invested);
  const current_value = input.current_value !== undefined ? Number(input.current_value) : amount_invested;
  const expected_return = input.expected_return !== undefined ? Number(input.expected_return) : 0;
  const investment_date = String(input.investment_date);
  const notes = input.notes || '';

  if (!VALID_TYPES.includes(investment_type)) {
    throw new Error(`Invalid investment type. Must be one of: ${VALID_TYPES.join(', ')}`);
  }

  const chama = await query('SELECT id FROM chamas LIMIT 1');
  if (!chama || chama.length === 0) throw new Error('No Chama found.');

  const [result] = await sequelize.query(
    'INSERT INTO investments (chama_id, recorded_by, name, investment_type, amount_invested, current_value, expected_return, investment_date, notes) VALUES (:chama_id, :recorded_by, :name, :investment_type, :amount_invested, :current_value, :expected_return, :investment_date, :notes)',
    {
      replacements: {
        chama_id: chama[0].id,
        recorded_by: Number(adminId),
        name,
        investment_type,
        amount_invested,
        current_value,
        expected_return,
        investment_date,
        notes
      }
    }
  );

  const investmentId = result;

  await sequelize.query(
    'INSERT INTO audit_logs (performed_by_admin, action, target_table, target_id, details) VALUES (:admin, :action, :table, :target, :details)',
    {
      replacements: {
        admin: Number(adminId),
        action: 'INVESTMENT_ADDED',
        table: 'investments',
        target: investmentId,
        details: `${investment_type} investment "${name}" of KES ${amount_invested} recorded`
      }
    }
  );

  return getInvestmentById(investmentId);
};

const updateInvestmentValue = async (investmentId, newValue, adminId) => {
  const existing = await query(
    'SELECT id, name, amount_invested, current_value FROM investments WHERE id = ?',
    [Number(investmentId)]
  );
  if (!existing || existing.length === 0) throw new Error('Investment not found.');

  const oldValue = Number(existing[0].current_value);
  const updatedValue = Number(newValue);

  await query(
    'UPDATE investments SET current_value = ? WHERE id = ?',
    [updatedValue, Number(investmentId)]
  );

  await sequelize.query(
    'INSERT INTO audit_logs (performed_by_admin, action, target_table, target_id, details) VALUES (:admin, :action, :table, :target, :details)',
    {
      replacements: {
        admin: Number(adminId),
        action: 'INVESTMENT_VALUE_UPDATED',
        table: 'investments',
        target: Number(investmentId),
        details: `Value of "${existing[0].name}" updated from KES ${oldValue} to KES ${updatedValue}`
      }
    }
  );

  return getInvestmentById(investmentId);
};

const getInvestmentById = async (investmentId) => {
  const investments = await query(
    'SELECT id, name, investment_type, amount_invested, current_value, expected_return, investment_date, notes, created_at FROM investments WHERE id = ?',
    [Number(investmentId)]
  );
  if (!investments || investments.length === 0) throw new Error('Investment not found.');
  return attachProfitLoss(investments[0]);
};

const attachProfitLoss = (investment) => {
  const invested = Number(investment.amount_invested);
  const current = Number(investment.current_value);
  investment.profit_loss = Math.round((current - invested) * 100) / 100;
  investment.profit_loss_percentage = invested > 0
    ? Math.round(((current - invested) / invested) * 10000) / 100
    : 0;
  return investment;
};

const getPortfolio = async () => {
  const investments = await query(
    'SELECT id, name, investment_type, amount_invested, current_value, expected_return, investment_date, notes, created_at FROM investments ORDER BY investment_date DESC'
  );

  const withProfitLoss = (investments || []).map(attachProfitLoss);

  const totalInvested = withProfitLoss.reduce((sum, i) => sum + Number(i.amount_invested), 0);
  const totalCurrentValue = withProfitLoss.reduce((sum, i) => sum + Number(i.current_value), 0);
  const totalProfitLoss = Math.round((totalCurrentValue - totalInvested) * 100) / 100;

  return {
    investments: withProfitLoss,
    total_invested: Math.round(totalInvested * 100) / 100,
    total_current_value: Math.round(totalCurrentValue * 100) / 100,
    total_profit_loss: totalProfitLoss,
    count: withProfitLoss.length
  };
};

const getMyPortfolioShare = async (memberId) => {
  const memberContributions = await query(
    'SELECT COALESCE(SUM(amount), 0) as total FROM contributions WHERE member_id = ?',
    [Number(memberId)]
  );

  const allContributions = await query(
    'SELECT COALESCE(SUM(amount), 0) as total FROM contributions'
  );

  const memberTotal = Number(memberContributions[0].total);
  const allTotal = Number(allContributions[0].total);
  const portfolio = await getPortfolio();

  if (allTotal === 0) {
    return { share_percentage: 0, estimated_value: 0, portfolio_total_value: portfolio.total_current_value };
  }

  const sharePercentage = Math.round((memberTotal / allTotal) * 10000) / 100;
  const estimatedValue = Math.round((sharePercentage / 100) * portfolio.total_current_value * 100) / 100;

  return {
    share_percentage: sharePercentage,
    estimated_value: estimatedValue,
    portfolio_total_value: portfolio.total_current_value
  };
};

module.exports = { addInvestment, updateInvestmentValue, getInvestmentById, getPortfolio, getMyPortfolioShare };