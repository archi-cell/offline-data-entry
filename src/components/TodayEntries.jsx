
import { useCallback, useEffect, useState } from 'react';

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

export default function TodayEntries() {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadEntries = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const records = await window.entryAPI.getToday();
            setEntries(records);
        } catch (err) {
            setError(err.message || "Couldn't load today's entries.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEntries();
    }, [loadEntries]);

    const totalDeposit = entries.reduce(
        (sum, entry) => sum + Number(entry.total_deposit || 0),
        0
    );

    const totalCommission = entries.reduce(
        (sum, entry) => sum + Number(entry.commission || 0),
        0
    );

    const totalTDS = entries.reduce(
        (sum, entry) => sum + Number(entry.tds_amount || 0),
        0
    );

    const totalNet = entries.reduce(
        (sum, entry) => sum + Number(entry.net_commission || 0),
        0
    );

    return (
        <section className="today-page">
            <div className="today-heading">
                <div>
                    <h1>Today's Entries</h1>
                    <p>Records saved with today's entry date.</p>
                </div>

                <button
                    type="button"
                    className="today-refresh"
                    onClick={loadEntries}
                    disabled={loading}
                >
                    {loading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {error && <div className="entry-message error">{error}</div>}

            <div className="today-summary">
                <div>
                    <span>Entries</span>
                    <strong>{loading ? '—' : entries.length}</strong>
                </div>
                <div>
                    <span>Total Deposits</span>
                    <strong>{loading ? '—' : money(totalDeposit)}</strong>
                </div>
                <div>
                    <span>Commission</span>
                    <strong>{loading ? '—' : money(totalCommission)}</strong>
                </div>
                <div>
                    <span>TDS</span>
                    <strong>{loading ? '—' : money(totalTDS)}</strong>
                </div>
                <div>
                    <span>Net Commission</span>
                    <strong>{loading ? '—' : money(totalNet)}</strong>
                </div>
            </div>

            {loading ? (
                <div className="entries-empty">Loading today's entries...</div>
            ) : entries.length === 0 ? (
                <div className="entries-empty">
                    No entries were found for today's date.
                </div>
            ) : (
                <div className="entries-table-wrap">
                    <table className="entries-table">
                        <thead>
                            <tr>
                                <th>Sr. No.</th>
                                <th>Entry Date</th>
                                <th>Account Number</th>
                                <th>Customer</th>
                                <th>Mobile</th>
                                <th>Category</th>
                                <th>Deposit</th>
                                <th>Commission</th>
                                <th>TDS</th>
                                <th>Net Commission</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry) => (
                                <tr key={entry.id}>
                                    <td>{entry.id}</td>
                                    <td>{formatDate(entry.entry_date)}</td>
                                    <td>{entry.account_number}</td>
                                    <td>{entry.customer_name}</td>
                                    <td>{entry.mobile_number}</td>
                                    <td>{entry.category}</td>
                                    <td>{money(entry.total_deposit)}</td>
                                    <td>{money(entry.commission)}</td>
                                    <td>{money(entry.tds_amount)}</td>
                                    <td>{money(entry.net_commission)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
