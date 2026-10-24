
import { useCallback, useEffect, useState } from 'react';

export default function Settings() {
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const loadInfo = useCallback(async () => {
        setLoading(true);
        setError('');
        setNotice('');

        try {
            const result = await window.entryAPI.getSettingsInfo();
            setInfo(result);
        } catch (err) {
            setError(err.message || 'Could not load application information.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadInfo();
    }, [loadInfo]);

    const openFolder = async () => {
        setError('');
        setNotice('');

        try {
            await window.entryAPI.openDatabaseFolder();
            setNotice('Database folder opened.');
        } catch (err) {
            setError(err.message || 'Could not open the database folder.');
        }
    };

    return (
        <section className="utility-page">
            <div className="utility-heading">
                <h1>Settings</h1>
                <p>Application information and local storage details.</p>
            </div>

            {loading ? (
                <div className="entries-empty">Loading settings...</div>
            ) : (
                <>
                    <div className="utility-card">
                        <h2>Application Information</h2>

                        <div className="settings-grid">
                            <span>Application name</span>
                            <strong>{info?.appName || 'Offline Entry System'}</strong>

                            <span>Application version</span>
                            <strong>{info?.appVersion || 'Not available'}</strong>

                            <span>Storage type</span>
                            <strong>Local SQLite database</strong>

                            <span>Saved entries</span>
                            <strong>{info?.totalEntries ?? 0}</strong>

                            <span>Internet required</span>
                            <strong>No — local data entry works offline</strong>
                        </div>

                        <div className="settings-actions">
                            <button
                                type="button"
                                className="utility-primary-button"
                                onClick={loadInfo}
                                disabled={loading}
                            >
                                Refresh Information
                            </button>

                            <button
                                type="button"
                                className="utility-secondary-button"
                                onClick={openFolder}
                            >
                                Open Database Folder
                            </button>
                        </div>
                    </div>

                    <div className="utility-card">
                        <h2>Database Location</h2>
                        <p className="settings-path">
                            {info?.databasePath || 'Database path unavailable'}
                        </p>
                        <p>
                            The database is stored on this computer. It is not automatically
                            shared with other computers. Use Backup &amp; Restore to transfer
                            a backup when needed.
                        </p>
                    </div>
                </>
            )}

            {notice && (
                <div className="entry-message success utility-message">{notice}</div>
            )}

            {error && (
                <div className="entry-message error utility-message">{error}</div>
            )}
        </section>
    );
}
