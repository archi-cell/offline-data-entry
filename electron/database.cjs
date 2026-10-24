
const Database = require('better-sqlite3');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

let db;

const CATEGORIES = [
    '1 year',
    '2 year',
    '3 year',
    '5 year',
    'MIS',
    'KVP',
    'NSC'
];

function initializeDatabase() {
    const dataDirectory = path.join(app.getPath('userData'), 'data');
    fs.mkdirSync(dataDirectory, { recursive: true });

    const databasePath = path.join(
        dataDirectory,
        'offline-entry-system.db'
    );

    db = new Database(databasePath);
    console.log('DATABASE FILE:', databasePath);

    db.pragma('journal_mode = WAL');

    db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_date TEXT NOT NULL,
      account_number TEXT NOT NULL,
      category TEXT NOT NULL CHECK (
        category IN (
          '1 year', '2 year', '3 year', '5 year',
          'MIS', 'KVP', 'NSC'
        )
      ),
      maturity_date TEXT NOT NULL,
      total_deposit REAL NOT NULL CHECK (total_deposit >= 0),
      commission REAL NOT NULL CHECK (commission >= 0),
      tds_percentage REAL NOT NULL CHECK (tds_percentage >= 0),
      tds_amount REAL NOT NULL CHECK (tds_amount >= 0),
      net_commission REAL NOT NULL,
      customer_name TEXT NOT NULL,
      mobile_number TEXT NOT NULL,
      address TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_entries_entry_date
    ON entries(entry_date);

    CREATE INDEX IF NOT EXISTS idx_entries_account_number
    ON entries(account_number);

    CREATE INDEX IF NOT EXISTS idx_entries_customer_name
    ON entries(customer_name);
  `);

    console.log('Database initialized:', databasePath);
    return databasePath;
}

function getDatabase() {
    if (!db) {
        throw new Error('Database has not been initialized.');
    }

    return db;
}


function closeDatabase() {
    if (db) {
        db.close();
        db = null;
    }
}

module.exports = {
    initializeDatabase,
    getDatabase,
    closeDatabase,
    CATEGORIES
};

