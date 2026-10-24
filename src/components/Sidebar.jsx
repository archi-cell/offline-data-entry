function Sidebar({ activePage, setActivePage }) {
    const menuItems = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'new-entry', label: 'New Entry' },
        { id: 'entries', label: 'All Entries' },
        { id: 'search', label: 'Search' },
        { id: 'reports', label: 'Reports' },
        { id: 'backup', label: 'Backup & Restore' },
        { id: 'settings', label: 'Settings' }
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="brand-icon">OE</div>

                <div>
                    <h2>Offline Entry</h2>
                    <span>System</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className={`nav-item ${activePage === item.id ? 'active' : ''
                            }`}
                        onClick={() => setActivePage(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                <span>Offline Mode</span>
            </div>
        </aside>
    );
}

export default Sidebar;
