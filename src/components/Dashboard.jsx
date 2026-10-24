
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

const todayLocal = () => {
    const now = new Date();
    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
    ].join('-');
};

export default function Dashboard({ setActivePage }) {
    const [entries, setEntries] = useState([]);
    const [todayEntries, setTodayEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('Checking...');
    const [error, setError] = useState('');

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const [all, today] = await Promise.all([
                window.entryAPI.getAll(),
                window.entryAPI.getToday()
            ]);

            setEntries(all);
            setTodayEntries(today);
            setStatus('Connected');
        } catch (err) {
            setStatus('Unavailable');
            setError(err.message || 'Could not read the local database.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const stats = useMemo(() => {
        return entries.reduce(
            (result, entry) => {
                result.deposit += Number(entry.total_deposit || 0);
                result.commission += Number(entry.commission || 0);
                result.tds += Number(entry.tds_amount || 0);
                result.net += Number(entry.net_commission || 0);

                const category = entry.category || 'Other';

                if (!result.categories[category]) {
                    result.categories[category] = {
                        count: 0,
                        deposit: 0,
                        commission: 0
                    };
                }

                result.categories[category].count += 1;
                result.categories[category].deposit += Number(entry.total_deposit || 0);
                result.categories[category].commission += Number(entry.commission || 0);

                return result;
            },
            {
                deposit: 0,
                commission: 0,
                tds: 0,
                net: 0,
                categories: {}
            }
        );
    }, [entries]);

    const categories = Object.entries(stats.categories)
        .sort((a, b) => b[1].deposit - a[1].deposit);

    const recentEntries = [...entries]
        .sort((a, b) => b.id - a.id)
        .slice(0, 5);

    const maximumCategoryDeposit = Math.max(
        1,
        ...categories.map(([, value]) => value.deposit)
    );

    return (
        <div className="dashboard-page">
            <div className="dashboard-heading">
                <div>
                    <h1>Dashboard</h1>
                    <p>Welcome to the Offline Entry System.</p>
                    <span className="dashboard-date">
                        {new Date().toLocaleDateString('en-IN', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                        })}
                    </span>
                </div>

                <button
                    type="button"
                    className="dashboard-refresh"
                    onClick={loadDashboard}
                    disabled={loading}
                >
                    {loading ? 'Refreshing...' : 'Refresh Analytics'}
                </button>
            </div>

            {error && <div className="entry-message error">{error}</div>}

            <div className="dashboard-stat-grid">
                <StatCard
                    label="Total Entries"
                    value={loading ? '—' : entries.length.toLocaleString('en-IN')}
                    note="All saved records"
                />
                <StatCard
                    label="Today's Entries"
                    value={loading ? '—' : todayEntries.length.toLocaleString('en-IN')}
                    note="Entries dated today"
                    onClick={() => setActivePage('today-entries')}
                />
                <StatCard
                    label="Total Deposits"
                    value={loading ? '—' : money(stats.deposit)}
                    note="Across all saved entries"
                />
                <StatCard
                    label="Net Commission"
                    value={loading ? '—' : money(stats.net)}
                    note="After recorded TDS"
                />
            </div>

            <div className="dashboard-stat-grid dashboard-finance-grid">
                <StatCard
                    label="Total Commission"
                    value={loading ? '—' : money(stats.commission)}
                    note="Calculated at 0.5%"
                />
                <StatCard
                    label="Total TDS"
                    value={loading ? '—' : money(stats.tds)}
                    note="Based on saved TDS percentages"
                />
                <StatCard
                    label="Database Status"
                    value={status}
                    note="Local database connection"
                    status={status === 'Connected' ? 'good' : 'neutral'}
                />
            </div>

            <section className="dashboard-panel">
                <h2>Quick Actions</h2>
                <p>Jump directly to a common task.</p>

                <div className="dashboard-actions">
                    <button
                        type="button"
                        onClick={() => setActivePage('new-entry')}
                    >
                        + New Entry
                    </button>

                    <button
                        type="button"
                        onClick={() => setActivePage('today-entries')}
                    >
                        View Today's Entries
                    </button>

                    <button
                        type="button"
                        onClick={() => setActivePage('search')}
                    >
                        Search Entries
                    </button>
                </div>
            </section>

            <div className="dashboard-lower-grid">
                <section className="dashboard-panel">
                    <h2>Category Analytics</h2>
                    <p className="dashboard-muted">Deposit totals by category</p>

                    {loading ? (
                        <p>Loading analytics...</p>
                    ) : categories.length === 0 ? (
                        <p className="dashboard-empty">No saved records yet.</p>
                    ) : (
                        <div className="dashboard-category-list">
                            {categories.map(([name, value]) => (
                                <div className="dashboard-category" key={name}>
                                    <div className="dashboard-category-heading">
                                        <strong>{name}</strong>
                                        <span>{money(value.deposit)}</span>
                                    </div>

                                    <div className="dashboard-bar-track">
                                        <div
                                            className="dashboard-bar"
                                            style={{
                                                width: `${(value.deposit / maximumCategoryDeposit) * 100}%`
                                            }}
                                        />
                                    </div>

                                    <small>
                                        {value.count} {value.count === 1 ? 'entry' : 'entries'}
                                        {' · '}
                                        Commission {money(value.commission)}
                                    </small>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="dashboard-panel">
                    <div className="dashboard-panel-heading">
                        <div>
                            <h2>Recent Entries</h2>
                            <p className="dashboard-muted">Your five latest records</p>
                        </div>

                        <button
                            type="button"
                            className="dashboard-text-button"
                            onClick={() => setActivePage('entries')}
                        >
                            All Entries →
                        </button>
                    </div>

                    {loading ? (
                        <p>Loading recent entries...</p>
                    ) : recentEntries.length === 0 ? (
                        <p className="dashboard-empty">No entries to display yet.</p>
                    ) : (
                        <div className="dashboard-recent-list">
                            {recentEntries.map((entry) => (
                                <div className="dashboard-recent-item" key={entry.id}>
                                    <div className="dashboard-recent-avatar">
                                        {(entry.customer_name || '?').trim().charAt(0).toUpperCase()}
                                    </div>

                                    <div className="dashboard-recent-details">
                                        <strong>{entry.customer_name}</strong>
                                        <span>
                                            #{entry.id} · {entry.category} · {formatDate(entry.entry_date)}
                                        </span>
                                    </div>

                                    <div className="dashboard-recent-amount">
                                        <strong>{money(entry.total_deposit)}</strong>
                                        <span>Deposit</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

function StatCard({ label, value, note, onClick, status }) {
    return (
        <div
            className={`dashboard-stat-card ${onClick ? 'dashboard-stat-clickable' : ''}`}
            onClick={onClick}
            onKeyDown={(event) => {
                if (onClick && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onClick();
                }
            }}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            <span className="dashboard-stat-label">{label}</span>
            <strong className={status === 'good' ? 'dashboard-status-good' : ''}>
                {value}
            </strong>
            <small>{note}</small>
        </div>
    );
}
