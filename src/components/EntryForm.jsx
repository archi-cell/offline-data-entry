
import { useEffect, useState } from 'react';

const getToday = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};


const getMaturityDate = (entryDate, category) => {
    const years = {
        '1 year': 1,
        '2 year': 2,
        '3 year': 3,
        '5 year': 5,
        'MIS': 5,
        'KVP': 5,
        'NSC': 5
    };

    if (!entryDate || !years[category]) {
        return '';
    }

    const [year, month, day] = entryDate.split('-').map(Number);
    const maturityYear = year + years[category];

    // Keep the same month and day where possible.
    // For leap-day dates, use the last valid day of February.
    const lastDay = new Date(maturityYear, month, 0).getDate();
    const maturityDay = Math.min(day, lastDay);

    return [
        maturityYear,
        String(month).padStart(2, '0'),
        String(maturityDay).padStart(2, '0')
    ].join('-');
};



const initialForm = () => {
    const entryDate = getToday();
    const category = '1 year';

    return {
        entry_date: entryDate,
        account_number: '',
        category,
        maturity_date: getMaturityDate(entryDate, category),
        total_deposit: '',
        tds_percentage: '2',
        customer_name: '',
        mobile_number: '',
        address: ''
    };
};


const money = (value) =>
    Number(value || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

export default function EntryForm() {
    const [form, setForm] = useState(initialForm);
    const [categories, setCategories] = useState([
        '1 year', '2 year', '3 year', '5 year',
        'MIS', 'KVP', 'NSC'
    ]);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        window.entryAPI.getCategories()
            .then(setCategories)
            .catch((err) => {
                console.error('Could not load categories:', err);
            });
    }, []);

    const deposit = Number(form.total_deposit) || 0;
    const tdsPercentage = Number(form.tds_percentage) || 0;

    const commission = Math.round(
        (deposit * 0.005 + Number.EPSILON) * 100
    ) / 100;

    const tdsAmount = Math.round(
        (commission * tdsPercentage / 100 + Number.EPSILON) * 100
    ) / 100;

    const netCommission = Math.round(
        (commission - tdsAmount + Number.EPSILON) * 100
    ) / 100;


    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => {
            const next = {
                ...previous,
                [name]: value
            };

            if (name === 'category') {
                next.maturity_date = getMaturityDate(
                    next.entry_date,
                    value
                );
            }

            if (name === 'entry_date') {
                next.maturity_date = getMaturityDate(
                    value,
                    next.category
                );
            }

            return next;
        });

        setMessage('');
        setError('');
    };


    const handleSubmit = async (event) => {
        event.preventDefault();
        setMessage('');
        setError('');

        if (!window.entryAPI) {
            setError('The database connection is unavailable. Restart the app.');
            return;
        }

        if (!Number.isFinite(deposit) || deposit < 0) {
            setError('Enter a valid, non-negative Total Deposit.');
            return;
        }

        if (
            form.tds_percentage.trim() === '' ||
            !Number.isFinite(Number(form.tds_percentage)) ||
            Number(form.tds_percentage) < 0
        ) {
            setError('Enter a valid, non-negative TDS percentage.');
            return;
        }

        setSaving(true);

        try {
            const savedEntry = await window.entryAPI.create({
                ...form,
                total_deposit: deposit,
                tds_percentage: Number(form.tds_percentage)
            });

            setMessage(
                `Entry saved successfully! Sr. No.: ${savedEntry.id}`
            );
            setForm(initialForm());
        } catch (err) {
            console.error('Could not save entry:', err);
            setError(err.message || 'Could not save the entry.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="entry-page">
            <div className="entry-heading">
                <div>
                    <h1>New Entry</h1>
                    <p>Enter customer and deposit details below.</p>
                </div>
            </div>

            {message && (
                <div className="entry-message success" role="status">
                    {message}
                </div>
            )}

            {error && (
                <div className="entry-message error" role="alert">
                    {error}
                </div>
            )}

            <form className="entry-form" onSubmit={handleSubmit}>
                <div className="entry-section">
                    <h2>Account Details</h2>

                    <div className="entry-grid">
                        <label>
                            Entry Date *
                            <input
                                type="date"
                                name="entry_date"
                                value={form.entry_date}
                                onChange={handleChange}
                                required
                            />
                        </label>

                        <label>
                            Account Number *
                            <input
                                type="text"
                                name="account_number"
                                value={form.account_number}
                                onChange={handleChange}
                                placeholder="Enter account number"
                                required
                            />
                        </label>

                        <label>
                            Category *
                            <select
                                name="category"
                                value={form.category}
                                onChange={handleChange}
                                required
                            >
                                {categories.map((category) => (
                                    <option key={category} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Maturity Date *
                            <input
                                type="date"
                                name="maturity_date"
                                value={form.maturity_date}
                                onChange={handleChange}
                                required
                            />
                        </label>
                    </div>
                </div>

                <div className="entry-section">
                    <h2>Deposit & Commission</h2>

                    <div className="entry-grid">
                        <label>
                            Total Deposit (₹) *
                            <input
                                type="number"
                                name="total_deposit"
                                value={form.total_deposit}
                                onChange={handleChange}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                required
                            />
                        </label>

                        <label>
                            Commission Rate
                            <input type="text" value="0.5%" readOnly />
                        </label>

                        <label>
                            Commission (₹)
                            <input type="text" value={money(commission)} readOnly />
                        </label>

                        <label>
                            TDS Percentage (%) *
                            <input
                                type="number"
                                name="tds_percentage"
                                value={form.tds_percentage}
                                onChange={handleChange}
                                min="0"
                                step="0.01"
                                required
                            />
                        </label>

                        <label>
                            TDS Amount (₹)
                            <input type="text" value={money(tdsAmount)} readOnly />
                        </label>

                        <label>
                            Net Commission (₹)
                            <input
                                type="text"
                                value={money(netCommission)}
                                readOnly
                            />
                        </label>
                    </div>

                    <p className="entry-note">
                        TDS is calculated on the commission, not on the total deposit.
                    </p>
                </div>

                <div className="entry-section">
                    <h2>Customer Details</h2>

                    <div className="entry-grid">
                        <label>
                            Customer Name *
                            <input
                                type="text"
                                name="customer_name"
                                value={form.customer_name}
                                onChange={handleChange}
                                placeholder="Enter full name"
                                required
                            />
                        </label>

                        <label>
                            Mobile Number *
                            <input
                                type="tel"
                                name="mobile_number"
                                value={form.mobile_number}
                                onChange={handleChange}
                                placeholder="Enter mobile number"
                                required
                            />
                        </label>

                        <label className="entry-full-width">
                            Address *
                            <textarea
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                placeholder="Enter complete address"
                                rows="3"
                                required
                            />
                        </label>
                    </div>
                </div>

                <div className="entry-actions">
                    <button
                        type="button"
                        className="entry-reset"
                        onClick={() => {
                            setForm(initialForm());
                            setMessage('');
                            setError('');
                        }}
                        disabled={saving}
                    >
                        Clear Form
                    </button>

                    <button
                        type="submit"
                        className="entry-save"
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Entry'}
                    </button>
                </div>
            </form>
        </section>
    );
}
