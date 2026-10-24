
import { useCallback, useEffect, useMemo, useState } from 'react';

const money = (value) =>
    Number(value || 0).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

const formatDate = (value) => {
    if (!value) return '—';
    const [year, month, day] = value.split('-');
    return `${day}-${month}-${year}`;
};

export default function AllEntries() {
    const [entries, setEntries] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const loadEntries = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const records = await window.entryAPI.getAll();
            setEntries(records);
        } catch (err) {
            console.error('Could not load entries:', err);
            setError(err.message || 'Unable to load saved entries.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEntries();
    }, [loadEntries]);

    const filteredEntries = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) return entries;

        return entries.filter((entry) =>
            [
                entry.customer_name,
                entry.account_number,
                entry.mobile_number,
                entry.category,
                entry.address
            ].some((value) =>
                String(value ?? '').toLowerCase().includes(term)
            )
        );
    }, [entries, search]);

    const handleDelete = async (entry) => {
        const confirmed = window.confirm(
            `Delete the entry for ${entry.customer_name} (Sr. No. ${entry.id})?\n\nThis cannot be undone.`
        );

        if (!confirmed) return;

        setError('');
        setNotice('');

        try {
            await window.entryAPI.delete(entry.id);
            setEntries((previous) =>
                previous.filter((item) => item.id !== entry.id)
            );
            setNotice(`Entry ${entry.id} deleted successfully.`);
        } catch (err) {
            console.error('Could not delete entry:', err);
            setError(err.message || 'Unable to delete this entry.');
        }
    };

    const totalDeposit = filteredEntries.reduce(
        (sum, entry) => sum + Number(entry.total_deposit || 0),
        0
    );

    const totalCommission = filteredEntries.reduce(
        (sum, entry) => sum + Number(entry.commission || 0),
        0
    );

    return (
        <section className="entries-page">
            <div className="entries-heading">
                <div>
                    <h1>All Entries</h1>
                    <p>View and manage records saved on this computer.</p>
                </div>

                <button
                    type="button"
                    className="entries-refresh"
                    onClick={loadEntries}
                    disabled={loading}
                >
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            <div className="entries-summary">
                <div className="entries-summary-card">
                    <span>Records shown</span>
                    <strong>{filteredEntries.length}</strong>
                </div>

                <div className="entries-summary-card">
                    <span>Total deposit shown</span>
                    <strong>{money(totalDeposit)}</strong>
                </div>

                <div className="entries-summary-card">
                    <span>Total commission shown</span>
                    <strong>{money(totalCommission)}</strong>
                </div>
            </div>

            <div className="entries-toolbar">
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, account number, mobile or category..."
                    aria-label="Search saved entries"
                />
                <span>{filteredEntries.length} result(s)</span>
            </div>

            {notice && (
                <div className="entry-message success" role="status">
                    {notice}
                </div>
            )}

            {error && (
                <div className="entry-message error" role="alert">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="entries-empty">Loading saved entries...</div>
            ) : filteredEntries.length === 0 ? (
                <div className="entries-empty">
                    {entries.length === 0
                        ? 'No entries have been saved yet.'
                        : 'No entries match your search.'}
                </div>
            ) : (
                <div className="entries-table-wrap">
                    <table className="entries-table">
                        <thead>
                            <tr>
                                <th>Sr. No.</th>
                                <th>Entry Date</th>
                                <th>Account No.</th>
                                <th>Customer</th>
                                <th>Mobile</th>
                                <th>Category</th>
                                <th>Maturity Date</th>
                                <th>Total Deposit</th>
                                <th>Commission</th>
                                <th>TDS %</th>
                                <th>TDS Amount</th>
                                <th>Net Commission</th>
                                <th>Address</th>
                                <th>Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredEntries.map((entry) => (
                                <tr key={entry.id}>
                                    <td>{entry.id}</td>
                                    <td>{formatDate(entry.entry_date)}</td>
                                    <td>{entry.account_number}</td>
                                    <td>{entry.customer_name}</td>
                                    <td>{entry.mobile_number}</td>
                                    <td>{entry.category}</td>
                                    <td>{formatDate(entry.maturity_date)}</td>
                                    <td>{money(entry.total_deposit)}</td>
                                    <td>{money(entry.commission)}</td>
                                    <td>{entry.tds_percentage}%</td>
                                    <td>{money(entry.tds_amount)}</td>
                                    <td>{money(entry.net_commission)}</td>
                                    <td>{entry.address}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className="entries-delete"
                                            onClick={() => handleDelete(entry)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
