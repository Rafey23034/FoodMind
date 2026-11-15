const mysql = require('mysql2/promise');
const config = require('./config');

const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  dateStrings: true,
  timezone: 'Z',
});

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function one(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function transaction(work, actorId = null) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query('SET @app_user_id = ?', [actorId]);
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    // Session variables survive COMMIT/ROLLBACK and must not leak to the next request.
    try {
      await connection.query('SET @app_user_id = NULL');
      connection.release();
    } catch {
      connection.destroy();
    }
  }
}

module.exports = { pool, query, one, transaction };
