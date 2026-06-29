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

const createCycle = async (input, adminId) => {
  const { payout_amount, start_date, positions } = input;

  const chama = await query('SELECT id FROM chamas LIMIT 1');
  if (chama.length === 0) throw new Error('No Chama found.');

  const activeCycle = await query(
    "SELECT id FROM cycles WHERE chama_id = ? AND status = 'ACTIVE'",
    [chama[0].id]
  );
  if (activeCycle.length > 0) throw new Error('An active cycle already exists. Complete it before creating a new one.');

  const cycleId = await insert(
    'INSERT INTO cycles SET chama_id = ?, created_by = ?, payout_amount = ?, start_date = ?',
    [chama[0].id, adminId, payout_amount, start_date]
  );

  for (const pos of positions) {
    const payoutDate = calculatePayoutDate(start_date, pos.position_number);
    await insert(
      'INSERT INTO cycle_positions SET cycle_id = ?, member_id = ?, position_number = ?, expected_payout_date = ?',
      [cycleId, pos.member_id, pos.position_number, payoutDate]
    );
  }

  await insert(
    'INSERT INTO audit_logs SET performed_by_admin = ?, action = ?, target_table = ?, target_id = ?, details = ?',
    [adminId, 'CYCLE_CREATED', 'cycles', cycleId, `Cycle created with ${positions.length} members, payout KES ${payout_amount}`]
  );

  return getCycleById(cycleId);
};

const calculatePayoutDate = (startDate, positionNumber) => {
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + (positionNumber - 1));
  return date.toISOString().split('T')[0];
};

const getCycleById = async (cycleId) => {
  const cycles = await query(
    `SELECT c.id, c.payout_amount, c.start_date, c.status, c.created_at,
            COUNT(cp.id) as total_positions
     FROM cycles c
     LEFT JOIN cycle_positions cp ON cp.cycle_id = c.id
     WHERE c.id = ?
     GROUP BY c.id`,
    [cycleId]
  );
  if (cycles.length === 0) throw new Error('Cycle not found.');

  const cycle = cycles[0];
  const positions = await getCyclePositions(cycleId);
  cycle.positions = positions;
  return cycle;
};

const getCyclePositions = async (cycleId) => {
  return query(
    `SELECT cp.id, cp.position_number, cp.expected_payout_date, cp.actual_payout_date, cp.status,
            m.full_name as member_name, m.member_number, m.id as member_id
     FROM cycle_positions cp
     JOIN members m ON m.id = cp.member_id
     WHERE cp.cycle_id = ?
     ORDER BY cp.position_number ASC`,
    [cycleId]
  );
};

const getCurrentCycle = async () => {
  const chama = await query('SELECT id FROM chamas LIMIT 1');
  const cycles = await query(
    "SELECT id FROM cycles WHERE chama_id = ? AND status = 'ACTIVE' LIMIT 1",
    [chama[0].id]
  );
  if (cycles.length === 0) return null;
  return getCycleById(cycles[0].id);
};

const getMyCyclePosition = async (memberId) => {
  const cycle = await getCurrentCycle();
  if (!cycle) return null;

  const positions = await query(
    `SELECT cp.id, cp.position_number, cp.expected_payout_date, cp.status,
            c.payout_amount
     FROM cycle_positions cp
     JOIN cycles c ON c.id = cp.cycle_id
     WHERE cp.member_id = ? AND c.status = 'ACTIVE'`,
    [memberId]
  );
  return positions.length > 0 ? positions[0] : null;
};

const completeCycle = async (cycleId, adminId) => {
  const cycle = await query(
    'SELECT id, status FROM cycles WHERE id = ?',
    [cycleId]
  );
  if (cycle.length === 0) throw new Error('Cycle not found.');
  if (cycle[0].status === 'COMPLETED') throw new Error('Cycle is already completed.');

  await query(
    "UPDATE cycles SET status = 'COMPLETED' WHERE id = ?",
    [cycleId]
  );

  await insert(
    'INSERT INTO audit_logs SET performed_by_admin = ?, action = ?, target_table = ?, target_id = ?, details = ?',
    [adminId, 'CYCLE_COMPLETED', 'cycles', cycleId, `Cycle ID ${cycleId} marked as completed`]
  );

  return getCycleById(cycleId);
};

module.exports = { createCycle, getCurrentCycle, getMyCyclePosition, getCyclePositions, completeCycle };