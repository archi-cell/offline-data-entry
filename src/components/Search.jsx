
import { useCallback, useEffect, useMemo, useState } from 'react';

const formatDate = (value) => {
    if (!value) return '—';
    const [year, month, day] = value.split('-');
    return `${day}-${month}-${year}`;
};

const money = (value) =>
    Number(value || 0).toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

export default function Search() {
    const [entries, setEntries] = useState([]);
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selected, setSelected] = useState(null);

    const loadEntries = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const records = await window.entryAPI.getAll();
            setEntries(records);
        } catch (err) {
            setError(err.message || 'Could not load saved entries.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEntries();
    }, [loadEntries]);

    const results = useMemo(() => {
        const term = query.trim().toLowerCase();

        return entries.filter((entry) => {
            const matchesText =
                !term ||
                [
                    entry.customer_name,
                    entry.account_number,
                    entry.mobile_number,
                    entry.address,
                    String(entry.id)
                ].some((value) =>
                    String(value ?? '').toLowerCase().includes(term)
                );

            const matchesCategory = !category || entry.category === category;
            const matchesFromDate = !fromDate || entry.entry_date >= fromDate;
            const matchesToDate = !toDate || entry.entry_date <= toDate;

            return (
                matchesText &&
                matchesCategory &&
                matchesFromDate &&
                matchesToDate
            );
        });
    }, [entries, query, category, fromDate, toDate]);

    const clearFilters = () => {
        setQuery('');
        setCategory('');
        setFromDate('');
        setToDate('');
        setSelected(null);
    };

    return (
        <section className="search-page">
            <div className="search-heading">
                <div>
                    <h1>Search Records</h1>
                    <p>Find saved entries using customer, account, category or date.</p>
                </div>
                <button
                    type="button"
                    className="search-secondary-button"
                    onClick={loadEntries}
                    disabled={loading}
                >
                    Refresh
                </button>
            </div>

            <div className="search-filters">
                <label>
                    Search by name, account, mobile, address or Sr. No.
                    <input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Enter a search term"
                    />
                </label>

                <label>
                    Category
                    <select
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                    >
                        <option value="">All categories</option>
                        <option value="1 year">1 year</option>
                        <option value="2 year">2 year</option>
                        <option value="3 year">3 year</option>
                        <option value="5 year">5 year</option>
                        <option value="MIS">MIS</option>
                        <option value="KVP">KVP</option>
                        <option value="NSC">NSC</option>
                    </select>
                </label>

                <label>
                    Entry date from
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(event) => setFromDate(event.target.value)}
                    />
                </label>

                <label>
                    Entry date to
                    <input
                        type="date"
                        value={toDate}
                        onChange={(event) => setToDate(event.target.value)}
                    />
                </label>

                <button
                    type="button"
                    className="search-clear-button"
                    onClick={clearFilters}
                >
                    Clear Filters
                </button>
            </div>

            {error && <div className="entry-message error">{error}</div>}

            <div className="search-results-heading">
                <h2>Results</h2>
                <span>{results.length} record(s)</span>
            </div>

            {loading ? (
                <div className="entries-empty">Loading records...</div>
            ) : results.length === 0 ? (
                <div className="entries-empty">
                    No matching records found. Try changing your filters.
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
                                <th>Deposit</th>
                                <th>Net Commission</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((entry) => (
                                <tr key={entry.id}>
                                    <td>{entry.id}</td>
                                    <td>{formatDate(entry.entry_date)}</td>
                                    <td>{entry.account_number}</td>
                                    <td>{entry.customer_name}</td>
                                    <td>{entry.mobile_number}</td>
                                    <td>{entry.category}</td>
                                    <td>{money(entry.total_deposit)}</td>
                                    <td>{money(entry.net_commission)}</td>
                                    <td>
                                        <button
                                            type="button"
                                            className="search-detail-button"
                                            onClick={() => setSelected(entry)}
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {selected && (
                <div className="search-modal-backdrop">
                    <section
                        className="search-detail-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="search-detail-title"
                    >
                        <div className="search-detail-heading">
                            <div>
                                <h2 id="search-detail-title">Entry Details</h2>
                                <p>Sr. No. {selected.id}</p>
                            </div>
                            <button
                                type="button"
                                className="search-secondary-button"
                                onClick={() => setSelected(null)}
                            >
                                Close
                            </button>
                        </div>

                        <dl className="search-detail-grid">
                            <dt>Entry Date</dt>
                            <dd>{formatDate(selected.entry_date)}</dd>

                            <dt>Account Number</dt>
                            <dd>{selected.account_number}</dd>

                            <dt>Category</dt>
                            <dd>{selected.category}</dd>

                            <dt>Maturity Date</dt>
                            <dd>{formatDate(selected.maturity_date)}</dd>

                            <dt>Customer Name</dt>
                            <dd>{selected.customer_name}</dd>

                            <dt>Mobile Number</dt>
                            <dd>{selected.mobile_number}</dd>

                            <dt>Address</dt>
                            <dd>{selected.address}</dd>

                            <dt>Total Deposit</dt>
                            <dd>{money(selected.total_deposit)}</dd>

                            <dt>Commission</dt>
                            <dd>{money(selected.commission)}</dd>

                            <dt>TDS Percentage</dt>
                            <dd>{selected.tds_percentage}%</dd>

                            <dt>TDS Amount</dt>
                            <dd>{money(selected.tds_amount)}</dd>

                            <dt>Net Commission</dt>
                            <dd>{money(selected.net_commission)}</dd>
                        </dl>
                    </section>
                </div>
            )}
        </section>
    );
}
