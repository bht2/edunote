const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'edunote',
  port:               parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  // Keep connections alive — prevents PROTOCOL_CONNECTION_LOST on idle
  enableKeepAlive:    true,
  keepAliveInitialDelay: 10000,
  // Reconnect on connection loss
  multipleStatements: false,
});

// Test connection on startup
pool.getConnection()
  .then(conn => { console.log('connected'); conn.release(); })
  .catch(err  => console.error('❌ Database connection failed:', err.message));

module.exports = pool;
