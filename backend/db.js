const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'events.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Initialize schema
function init() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          timestamp TEXT NOT NULL,
          userId TEXT NOT NULL,
          sourceIp TEXT,
          destinationIp TEXT,
          destinationPort INTEGER,
          status TEXT NOT NULL CHECK (status IN ('normal', 'attack', 'possible_zero_day')),
          severity TEXT NOT NULL CHECK (severity IN ('low', 'high', 'critical')),
          attackType TEXT,
          confidence REAL,
          reason TEXT NOT NULL,
          anomalyScore REAL,
          xgboostLabel TEXT,
          xgboostProb REAL,
          isoForestLabel TEXT,
          isoForestScore REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id)
        )
      `);

      db.run(`CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC)`, (err) => {
        if (err) {
          console.error('Index creation error:', err);
          reject(err);
        } else {
          console.log('Database schema initialized successfully');
          resolve(true);
        }
      });
    });
  });
}

// User functions
function getUserByUsername(username) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
      if (err) {
        console.error('Error getting user:', err);
        resolve(null);
      } else {
        resolve(row || null);
      }
    });
  });
}

function createUser(id, username, passwordHash) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)',
      [id, username, passwordHash],
      (err) => {
        if (err) {
          console.error('Error creating user:', err);
          resolve(false);
        } else {
          resolve(true);
        }
      }
    );
  });
}

// Event functions
function saveEvent(event) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO events (
        id, timestamp, userId, sourceIp, destinationIp, destinationPort,
        status, severity, attackType, confidence, reason, anomalyScore,
        xgboostLabel, xgboostProb, isoForestLabel, isoForestScore
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        event.timestamp,
        event.userId,
        event.sourceIp || null,
        event.destinationIp || null,
        event.destinationPort || null,
        event.status,
        event.severity,
        event.attackType || null,
        event.confidence ?? null,
        event.reason,
        event.anomalyScore ?? null,
        event.xgboostLabel || null,
        event.xgboostProb ?? null,
        event.isoForestLabel || null,
        event.isoForestScore ?? null
      ],
      (err) => {
        if (err) {
          console.error('Error saving event:', err);
          resolve(false);
        } else {
          resolve(true);
        }
      }
    );
  });
}

function getEvents(limit = 50) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM events ORDER BY timestamp DESC LIMIT ?',
      [limit],
      (err, rows) => {
        if (err) {
          console.error('Error getting events:', err);
          resolve([]);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}

function getUserEvents(userId, limit = 50) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM events WHERE userId = ? ORDER BY timestamp DESC LIMIT ?',
      [userId, limit],
      (err, rows) => {
        if (err) {
          console.error('Error getting user events:', err);
          resolve([]);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}

function getDashboardStats() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT
        COUNT(*) as totalEvents,
        SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as normalTraffic,
        SUM(CASE WHEN status = 'attack' THEN 1 ELSE 0 END) as attacks,
        SUM(CASE WHEN status = 'possible_zero_day' THEN 1 ELSE 0 END) as anomalies
      FROM events`,
      (err, result) => {
        if (err) {
          console.error('Error getting stats:', err);
          resolve({
            totalEvents: 0,
            normalTraffic: 0,
            attacks: 0,
            anomalies: 0
          });
        } else {
          resolve({
            totalEvents: result?.totalEvents || 0,
            normalTraffic: result?.normalTraffic || 0,
            attacks: result?.attacks || 0,
            anomalies: result?.anomalies || 0
          });
        }
      }
    );
  });
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
        reject(err);
      } else {
        console.log('Database closed');
        resolve(true);
      }
    });
  });
}

module.exports = {
  db,
  init,
  getUserByUsername,
  createUser,
  saveEvent,
  getEvents,
  getUserEvents,
  getDashboardStats,
  closeDatabase
};