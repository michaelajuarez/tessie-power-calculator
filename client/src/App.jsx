import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';

const STORAGE_KEY = 'tessie-calc-settings';

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
    // Strip the full rateplan object — only rateplanId is persisted now
    const { rateplan: _drop, ...rest } = saved;
    return rest;
  } catch {
    return {};
  }
}

const defaults = { tessieToken: '', openeiKey: '', zip: '', rateplanId: '' };

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [settings, setSettings] = useState(() => ({ ...defaults, ...loadSettings() }));
  const [saved, setSaved] = useState(false);

  function handleSave(newSettings) {
    // Only persist tokens, zip, and the plan ID — never the full plan object
    const { rateplan: _drop, ...toStore } = newSettings;
    setSettings(newSettings); // keep full object in memory for this session
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setTab('dashboard');
  }

  return (
    <div className="app">
      <header>
        <h1>Tessie Power Calculator</h1>
        <nav>
          <button
            className={tab === 'dashboard' ? 'active' : ''}
            onClick={() => setTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={tab === 'settings' ? 'active' : ''}
            onClick={() => setTab('settings')}
          >
            Settings
          </button>
        </nav>
        {saved && <span className="saved-badge">Saved!</span>}
      </header>

      <main>
        {tab === 'dashboard' ? (
          <Dashboard settings={settings} />
        ) : (
          <Settings settings={settings} onSave={handleSave} />
        )}
      </main>
    </div>
  );
}
