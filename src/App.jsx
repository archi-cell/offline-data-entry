
import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import EntryForm from './components/EntryForm';
import AllEntries from './components/AllEntries';
import Search from './components/Search';
import Reports from './components/Reports';
import BackupRestore from './components/BackupRestore';
import Settings from './components/Settings';
import TodayEntries from './components/TodayEntries';

import './App.css';

function App() {
  const [activePage, setActivePage] = useState('dashboard');

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard setActivePage={setActivePage} />;

      case 'new-entry':
        return <EntryForm />;

      case 'entries':
        return <AllEntries />;

      case 'today-entries':
        return <TodayEntries />;

      case 'search':
        return <Search />;

      case 'reports':
        return <Reports />;

      case 'backup':
        return <BackupRestore />;

      case 'settings':
        return <Settings />;



      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
      />

      <main className="main-content">
        {renderPage()}
      </main>
    </div>
  );
}

function PlaceholderPage({ title }) {
  return (
    <div className="placeholder-page">
      <h1>{title}</h1>
      <p>This section will be built in the next stages.</p>
    </div>
  );
}

export default App;
