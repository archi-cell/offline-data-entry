
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const {
    initializeDatabase,
    getDatabase,
    closeDatabase,
    CATEGORIES
} = require('./database.cjs');


const isDev = !app.isPackaged;

let databasePath;

function roundMoney(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function validateEntry(input) {
    if (!input || typeof input !== 'object') {
        throw new Error('Invalid entry.');
    }

    const textFields = [
        'entry_date',
        'account_number',
        'category',
        'maturity_date',
        'customer_name',
        'mobile_number',
        'address'
    ];

    for (const field of textFields) {
        if (typeof input[field] !== 'string' || !input[field].trim()) {
            throw new Error(`${field.replaceAll('_', ' ')} is required.`);
        }
    }

    if (!CATEGORIES.includes(input.category)) {
        throw new Error('Please select a valid category.');
    }

    const deposit = Number(input.total_deposit);
    const tdsPercentage = Number(input.tds_percentage);

    if (!Number.isFinite(deposit) || deposit < 0) {
        throw new Error('Enter a valid Total Deposit.');
    }

    if (!Number.isFinite(tdsPercentage) || tdsPercentage < 0) {
        throw new Error('Enter a valid TDS percentage.');
    }

    return {
        ...input,
        entry_date: input.entry_date.trim(),
        account_number: input.account_number.trim(),
        customer_name: input.customer_name.trim(),
        mobile_number: input.mobile_number.trim(),
        address: input.address.trim(),
        total_deposit: roundMoney(deposit),
        tds_percentage: tdsPercentage
    };
}

function calculateAmounts(entry) {
    const commission = roundMoney(entry.total_deposit * 0.005);
    const tds_amount = roundMoney(
        commission * entry.tds_percentage / 100
    );

    return {
        commission,
        tds_amount,
        net_commission: roundMoney(commission - tds_amount)
    };
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}

function registerDatabaseHandlers() {
    ipcMain.handle('entries:getCategories', () => CATEGORIES);

    ipcMain.handle('entries:getAll', () => {
        return getDatabase()
            .prepare('SELECT * FROM entries ORDER BY id DESC')
            .all();
    });

    ipcMain.handle('entries:getToday', () => {
        const now = new Date();
        const today = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0')
        ].join('-');

        return getDatabase()
            .prepare(
                'SELECT * FROM entries WHERE entry_date = ? ORDER BY id DESC'
            )
            .all(today);
    });

    ipcMain.handle('entries:create', (_event, input) => {
        const entry = validateEntry(input);
        const amounts = calculateAmounts(entry);

        const result = getDatabase().prepare(`
      INSERT INTO entries (
        entry_date, account_number, category, maturity_date,
        total_deposit, commission, tds_percentage, tds_amount,
        net_commission, customer_name, mobile_number, address
      ) VALUES (
        @entry_date, @account_number, @category, @maturity_date,
        @total_deposit, @commission, @tds_percentage, @tds_amount,
        @net_commission, @customer_name, @mobile_number, @address
      )
    `).run({ ...entry, ...amounts });

        return getDatabase()
            .prepare('SELECT * FROM entries WHERE id = ?')
            .get(result.lastInsertRowid);
    });

    ipcMain.handle('entries:update', (_event, input) => {
        if (!Number.isInteger(input?.id) || input.id <= 0) {
            throw new Error('A valid entry ID is required.');
        }

        const entry = validateEntry(input);
        const amounts = calculateAmounts(entry);

        const result = getDatabase().prepare(`
      UPDATE entries SET
        entry_date = @entry_date,
        account_number = @account_number,
        category = @category,
        maturity_date = @maturity_date,
        total_deposit = @total_deposit,
        commission = @commission,
        tds_percentage = @tds_percentage,
        tds_amount = @tds_amount,
        net_commission = @net_commission,
        customer_name = @customer_name,
        mobile_number = @mobile_number,
        address = @address,
        updated_at = datetime('now', 'localtime')
      WHERE id = @id
    `).run({ ...entry, ...amounts, id: input.id });

        if (!result.changes) {
            throw new Error('Entry not found.');
        }

        return getDatabase()
            .prepare('SELECT * FROM entries WHERE id = ?')
            .get(input.id);
    });

    ipcMain.handle('entries:delete', (_event, id) => {
        if (!Number.isInteger(id) || id <= 0) {
            throw new Error('A valid entry ID is required.');
        }

        return getDatabase()
            .prepare('DELETE FROM entries WHERE id = ?')
            .run(id).changes > 0;
    });
}


async function registerUtilityHandlers() {
    const Database = require('better-sqlite3');

    ipcMain.handle('backup:create', async () => {
        const result = await dialog.showSaveDialog({
            title: 'Save Database Backup',
            defaultPath: `offline-entry-backup-${new Date()
                .toISOString()
                .slice(0, 10)}.db`,
            filters: [{ name: 'SQLite Database', extensions: ['db'] }]
        });

        if (result.canceled || !result.filePath) {
            return { canceled: true };
        }

        if (path.resolve(result.filePath) === path.resolve(databasePath)) {
            throw new Error('Choose a different location from the active database.');
        }

        await getDatabase().backup(result.filePath);

        return {
            canceled: false,
            filePath: result.filePath
        };
    });

    ipcMain.handle('backup:restore', async () => {
        const result = await dialog.showOpenDialog({
            title: 'Select Database Backup',
            properties: ['openFile'],
            filters: [{ name: 'SQLite Database', extensions: ['db'] }]
        });

        if (result.canceled || !result.filePaths.length) {
            return { canceled: true };
        }

        const sourcePath = result.filePaths[0];

        if (path.resolve(sourcePath) === path.resolve(databasePath)) {
            throw new Error('The selected file is already the active database.');
        }

        // Validate the selected backup before changing the active database.
        let backupDb;

        try {
            backupDb = new Database(sourcePath, {
                readonly: true,
                fileMustExist: true
            });

            const integrity = backupDb.pragma('integrity_check', { simple: true });

            if (integrity !== 'ok') {
                throw new Error('The selected database failed its integrity check.');
            }

            const table = backupDb.prepare(`
        SELECT name FROM sqlite_master
        WHERE type = 'table' AND name = 'entries'
      `).get();

            if (!table) {
                throw new Error('This backup does not contain the entries table.');
            }

            const columns = backupDb.prepare('PRAGMA table_info(entries)').all();
            const requiredColumns = [
                'id', 'entry_date', 'account_number', 'category',
                'maturity_date', 'total_deposit', 'commission',
                'tds_percentage', 'tds_amount', 'net_commission',
                'customer_name', 'mobile_number', 'address'
            ];

            const availableColumns = new Set(columns.map((column) => column.name));
            const missingColumns = requiredColumns.filter(
                (column) => !availableColumns.has(column)
            );

            if (missingColumns.length) {
                throw new Error(
                    `This backup is missing required fields: ${missingColumns.join(', ')}`
                );
            }
        } finally {
            if (backupDb) backupDb.close();
        }

        const confirmation = await dialog.showMessageBox({
            type: 'warning',
            buttons: ['Cancel', 'Restore Backup'],
            defaultId: 0,
            cancelId: 0,
            title: 'Confirm Database Restore',
            message: 'Restore this backup?',
            detail:
                'The current records will be replaced by the records in the selected backup. A safety copy of the current database will be created first.'
        });

        if (confirmation.response !== 1) {
            return { canceled: true };
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safetyPath = path.join(
            path.dirname(databasePath),
            `offline-entry-before-restore-${timestamp}.db`
        );

        // Make a safety backup while the active database is still open.
        await getDatabase().backup(safetyPath);

        // Close SQLite before replacing its file.
        closeDatabase();

        try {
            for (const suffix of ['-wal', '-shm']) {
                const sidecarPath = `${databasePath}${suffix}`;

                if (fs.existsSync(sidecarPath)) {
                    fs.rmSync(sidecarPath, { force: true });
                }
            }

            fs.copyFileSync(sourcePath, databasePath);
            databasePath = initializeDatabase();

            return {
                canceled: false,
                safetyPath
            };
        } catch (error) {
            // Attempt to recover the safety copy if restoring fails.
            try {
                if (fs.existsSync(safetyPath)) {
                    for (const suffix of ['-wal', '-shm']) {
                        fs.rmSync(`${databasePath}${suffix}`, { force: true });
                    }

                    fs.copyFileSync(safetyPath, databasePath);
                }
            } finally {
                databasePath = initializeDatabase();
            }

            throw error;
        }
    });

    ipcMain.handle('settings:getInfo', () => {
        return {
            appName: app.getName(),
            appVersion: app.getVersion(),
            databasePath,
            totalEntries: getDatabase()
                .prepare('SELECT COUNT(*) AS total FROM entries')
                .get().total
        };
    });

    ipcMain.handle('settings:openDatabaseFolder', async () => {
        const folderPath = path.dirname(databasePath);
        const error = await shell.openPath(folderPath);

        if (error) {
            throw new Error(error);
        }

        return true;
    });
}


app.whenReady().then(async () => {
    try {
        databasePath = initializeDatabase();
        registerDatabaseHandlers();
        await registerUtilityHandlers();
        createWindow();
    } catch (error) {
        console.error('Application startup failed:', error);
        app.quit();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
