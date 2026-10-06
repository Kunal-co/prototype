// SQLite via libSQL: local file in dev, Turso (hosted SQLite) on Vercel, because Vercel's filesystem is read-only/ephemeral.
const { createClient } = require('@libsql/client');
const path = require('path');
const url = process.env.TURSO_DATABASE_URL || 'file:' + path.join(__dirname, '..', 'data', 'events.db');
if (process.env.VERCEL && !process.env.TURSO_DATABASE_URL) throw new Error('TURSO_DATABASE_URL is required on Vercel (SQLite files do not persist there).');
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
let ready;
const init = () => ready || (ready = client.batch([
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, timestamp TEXT NOT NULL, userId TEXT NOT NULL, sourceIp TEXT, destinationIp TEXT,
    status TEXT NOT NULL, severity TEXT NOT NULL, attackType TEXT, confidence REAL, reason TEXT NOT NULL, anomalyScore REAL)`,
  `CREATE INDEX IF NOT EXISTS idx_events_ts ON events(timestamp DESC)`], 'write'));
const rows = async (sql, args = []) => (await client.execute({ sql, args })).rows.map(r => ({ ...r }));

const getUserByUsername = async u => (await rows('SELECT * FROM users WHERE username=?', [u]))[0] || null;
const createUser = (id, username, hash) => client.execute({ sql: 'INSERT INTO users VALUES (?,?,?)', args: [id, username, hash] });
async function saveEvent(e) {
  await client.execute({ sql: `INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    args: [e.id, e.timestamp, e.userId, e.sourceIp, e.destinationIp, e.status, e.severity, e.attackType, e.confidence, e.reason, e.anomalyScore] });
  return e;
}
const getEvents = (limit = 50) => rows('SELECT * FROM events ORDER BY timestamp DESC LIMIT ?', [limit]);
const getUserEvents = (userId, limit = 50) => rows('SELECT * FROM events WHERE userId=? ORDER BY timestamp DESC LIMIT ?', [userId, limit]);
async function getDashboardStats() {
  const r = (await rows(`SELECT COUNT(*) total, SUM(status='normal') normal, SUM(status='attack') attacks, SUM(status='possible_zero_day') anomalies FROM events`))[0];
  return { totalEvents: r.total || 0, normalTraffic: r.normal || 0, attacks: r.attacks || 0, anomalies: r.anomalies || 0 };
}
module.exports = { init, getUserByUsername, createUser, saveEvent, getEvents, getUserEvents, getDashboardStats };
