
import { useState } from 'react';

export default function BackupRestore() {
    const [busy, setBusy] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const createBackup = async () => {
        setBusy('backup');
        setMessage('');
        setError('');

        try {
            const result = await window.entryAPI.createBackup();

            if (result.canceled) {
                setMessage('Backup cancelled.');
            } else {
                setMessage(`Backup saved successfully:\n${result.filePath}`);
            }
        } catch (err) {
            setError(err.message || 'Could not create the backup.');
        } finally {
            setBusy('');
        }
    };

    const restoreBackup = async () => {
        setBusy('restore');
        setMessage('');
        setError('');

        try {
            const result = await window.entryAPI.restoreBackup();

            if (result.canceled) {
                setMessage('Restore cancelled. Your current records were not replaced.');
            } else {
                setMessage(
                    `Backup restored successfully.\nSafety copy: ${result.safetyPath}\n\nThe app will reload the restored records when you open another section.`
                );
            }
        } catch (err) {
            setError(err.message || 'Could not restore the backup.');
        } finally {
            setBusy('');
        }
    };

    return (
        <section className="utility-page">
            <div className="utility-heading">
                <h1>Backup &amp; Restore</h1>
                <p>Protect your records and move them between computers.</p>
            </div>

            <div className="utility-card">
                <h2>Create a Backup</h2>
                <p>
                    Save a copy of your complete local database to a location you choose.
                    Keep the backup on a separate drive or trusted storage location.
                </p>
                <button
                    type="button"
                    className="utility-primary-button"
                    onClick={createBackup}
                    disabled={Boolean(busy)}
                >
                    {busy === 'backup' ? 'Creating backup...' : 'Create Backup'}
                </button>
            </div>

            <div className="utility-card">
                <h2>Restore a Backup</h2>
                <p>
                    Select a previous database backup. The file will be checked before
                    restoration, and a safety copy of your current database will be made.
                    Restoring replaces the current records with the backup's records.
                </p>
                <button
                    type="button"
                    className="utility-danger-button"
                    onClick={restoreBackup}
                    disabled={Boolean(busy)}
                >
                    {busy === 'restore' ? 'Restoring...' : 'Choose Backup to Restore'}
                </button>
            </div>

            {message && (
                <div className="entry-message success utility-message">
                    {message}
                </div>
            )}

            {error && (
                <div className="entry-message error utility-message">
                    {error}
                </div>
            )}

            <div className="utility-note">
                <strong>Important:</strong> Back up your database regularly. Keep your
                backup files secure because they contain customer names, account
                numbers, mobile numbers and addresses.
            </div>
        </section>
    );
}
