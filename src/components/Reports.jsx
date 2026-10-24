
import { useCallback, useEffect, useMemo, useState } from 'react';

const CATEGORIES = [
    '1 year', '2 year', '3 year', '5 year', 'MIS', 'KVP', 'NSC'
];

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

const csvCell = (value) =>
    `"${String(value ?? '').replace(/"/g, '""')}"`;

export default function Reports() {
    const [entries, setEntries] = useState([]);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [category, setCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const loadEntries = useCallback(async () => {
        setLoading(true);
        setError('');
        setNotice('');

        try {
            const records = await window.entryAPI.getAll();
            setEntries(records);
        } catch (err) {
            setError(err.message || 'Could not load records.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadEntries();
    }, [loadEntries]);

    const filteredEntries = useMemo(() => {
        return entries.filter((entry) => {
            const afterStart = !fromDate || entry.entry_date >= fromDate;
            const beforeEnd = !toDate || entry.entry_date <= toDate;
            const matchesCategory = !category || entry.category === category;

            return afterStart && beforeEnd && matchesCategory;
        });
    }, [entries, fromDate, toDate, category]);

    const totals = useMemo(() => {
        return filteredEntries.reduce(
            (sum, entry) => ({
                deposit: sum.deposit + Number(entry.total_deposit || 0),
                commission: sum.commission + Number(entry.commission || 0),
                tds: sum.tds + Number(entry.tds_amount || 0),
                net: sum.net + Number(entry.net_commission || 0)
            }),
            { deposit: 0, commission: 0, tds: 0, net: 0 }
        );
    }, [filteredEntries]);

    const categoryTotals = useMemo(() => {
        return CATEGORIES.map((name) => {
            const rows = filteredEntries.filter((entry) => entry.category === name);

            return {
                name,
                count: rows.length,
                deposit: rows.reduce(
                    (sum, row) => sum + Number(row.total_deposit || 0), 0
                ),
                commission: rows.reduce(
                    (sum, row) => sum + Number(row.commission || 0), 0
                ),
                tds: rows.reduce(
                    (sum, row) => sum + Number(row.tds_amount || 0), 0
                ),
                net: rows.reduce(
                    (sum, row) => sum + Number(row.net_commission || 0), 0
                )
            };
        }).filter((item) => item.count > 0);
    }, [filteredEntries]);

    const clearFilters = () => {
        setFromDate('');
        setToDate('');
        setCategory('');
        setNotice('');
    };

    const exportCSV = () => {
        if (filteredEntries.length === 0) {
            setError('There are no records to export.');
            return;
        }

        const headers = [
            'Sr. No.', 'Entry Date', 'Account Number', 'Category',
            'Maturity Date', 'Total Deposit', 'Commission',
            'TDS Percentage', 'TDS Amount', 'Net Commission',
            'Customer Name', 'Mobile Number', 'Address'
        ];


        const rows = filteredEntries.map((entry) => [
            entry.id,
            formatDate(entry.entry_date),
            entry.account_number,
            entry.category,
            formatDate(entry.maturity_date),
            entry.total_deposit,
            entry.commission,
            entry.tds_percentage,
            entry.tds_amount,
            entry.net_commission,
            entry.customer_name,
            entry.mobile_number,
            entry.address
        ]);


        const csv = [
            headers,
            ...rows
        ].map((row) => row.map(csvCell).join(',')).join('\r\n');

        const blob = new Blob(
            ['\uFEFF', csv],
            { type: 'text/csv;charset=utf-8;' }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const today = new Date().toISOString().slice(0, 10);

        link.href = url;
        link.download = `entry-report-${today}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        setError('');
        setNotice('Report exported. Check your browser downloads.');
    };

    return (
        <section className="reports-page">
            <div className="reports-heading">
                <div>
                    <h1>Reports</h1>
                    <p>Review deposits, commissions and TDS from saved entries.</p>
                </div>

                <div className="reports-actions">
                    <button
                        type="button"
                        className="reports-secondary-button"
                        onClick={loadEntries}
                        disabled={loading}
                    >
                        Refresh
                    </button>

                    <button
                        type="button"
                        className="reports-export-button"
                        onClick={exportCSV}
                        disabled={loading || filteredEntries.length === 0}
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="reports-filters">
                <label>
                    Entry date from
                    <input
                        type="date"
                        value={fromDate}
                        max={toDate || undefined}
                        onChange={(event) => setFromDate(event.target.value)}
                    />
                </label>

                <label>
                    Entry date to
                    <input
                        type="date"
                        value={toDate}
                        min={fromDate || undefined}
                        onChange={(event) => setToDate(event.target.value)}
                    />
                </label>

                <label>
                    Category
                    <select
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                    >
                        <option value="">All categories</option>
                        {CATEGORIES.map((item) => (
                            <option key={item} value={item}>{item}</option>
                        ))}
                    </select>
                </label>

                <button
                    type="button"
                    className="reports-secondary-button"
                    onClick={clearFilters}
                >
                    Clear Filters
                </button>
            </div>

            {error && <div className="entry-message error">{error}</div>}
            {notice && <div className="entry-message success">{notice}</div>}

            {loading ? (
                <div className="entries-empty">Loading report data...</div>
            ) : (
                <>
                    <div className="reports-summary">
                        <SummaryCard label="Records" value={filteredEntries.length} />
                        <SummaryCard label="Total Deposits" value={money(totals.deposit)} />
                        <SummaryCard label="Commission" value={money(totals.commission)} />
                        <SummaryCard label="TDS" value={money(totals.tds)} />
                        <SummaryCard label="Net Commission" value={money(totals.net)} />
                    </div>

                    <section className="reports-section">
                        <h2>Category Summary</h2>

                        {categoryTotals.length === 0 ? (
                            <p className="reports-empty">No records match these filters.</p>
                        ) : (
                            <div className="entries-table-wrap">
                                <table className="entries-table">
                                    <thead>
                                        <tr>
                                            <th>Category</th>
                                            <th>Records</th>
                                            <th>Total Deposits</th>
                                            <th>Commission</th>
                                            <th>TDS</th>
                                            <th>Net Commission</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {categoryTotals.map((item) => (
                                            <tr key={item.name}>
                                                <td>{item.name}</td>
                                                <td>{item.count}</td>
                                                <td>{money(item.deposit)}</td>
                                                <td>{money(item.commission)}</td>
                                                <td>{money(item.tds)}</td>
                                                <td>{money(item.net)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    <section className="reports-section">
                        <div className="reports-detail-heading">
                            <h2>Detailed Report</h2>
                            <span>{filteredEntries.length} record(s)</span>
                        </div>

                        {filteredEntries.length === 0 ? (
                            <p className="reports-empty">No records match these filters.</p>
                        ) : (
                            <div className="entries-table-wrap">
                                <table className="entries-table">
                                    <thead>
                                        <tr>
                                            <th>Sr. No.</th>
                                            <th>Entry Date</th>
                                            <th>Account No.</th>
                                            <th>Customer</th>
                                            <th>Category</th>
                                            <th>Maturity Date</th>
                                            <th>Deposit</th>
                                            <th>Commission</th>
                                            <th>TDS</th>
                                            <th>Net Commission</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredEntries.map((entry) => (
                                            <tr key={entry.id}>
                                                <td>{entry.id}</td>
                                                <td>{formatDate(entry.entry_date)}</td>
                                                <td>{entry.account_number}</td>
                                                <td>{entry.customer_name}</td>
                                                <td>{entry.category}</td>
                                                <td>{formatDate(entry.maturity_date)}</td>
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
                </>
            )}
        </section>
    );
}

function SummaryCard({ label, value }) {
    return (
        <div className="reports-summary-card">
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    );
}
