import React, { useState } from 'react';
import { fetchRates } from '../api/client';

export default function Settings({ settings, onSave }) {
  const [form, setForm] = useState(settings);
  const [rates, setRates] = useState([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [rateError, setRateError] = useState('');

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function lookupRates() {
    if (!form.zip || !form.openeiKey) {
      setRateError('Enter your ZIP code and OpenEI API key first.');
      return;
    }
    setLoadingRates(true);
    setRateError('');
    try {
      const data = await fetchRates(form, form.zip);
      setRates(data);
      if (data.length === 0) setRateError('No residential rates found for that ZIP.');
    } catch (err) {
      setRateError(err.message);
    } finally {
      setLoadingRates(false);
    }
  }

  function save(e) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <form className="settings-form" onSubmit={save}>
      <h2>Settings</h2>

      <section>
        <h3>Tessie</h3>
        <label>
          API Token
          <input
            type="password"
            placeholder="Paste your Tessie API token"
            value={form.tessieToken}
            onChange={(e) => set('tessieToken', e.target.value)}
          />
          <small>
            Get yours at{' '}
            <a href="https://tessie.com/settings/api" target="_blank" rel="noreferrer">
              tessie.com/settings/api
            </a>
          </small>
        </label>
      </section>

      <section>
        <h3>Electricity Rate</h3>
        <label>
          ZIP Code
          <input
            type="text"
            placeholder="e.g. 94105"
            value={form.zip}
            onChange={(e) => set('zip', e.target.value)}
            maxLength={10}
          />
        </label>
        <label>
          OpenEI API Key
          <input
            type="password"
            placeholder="Get a free key at openei.org/services"
            value={form.openeiKey}
            onChange={(e) => set('openeiKey', e.target.value)}
          />
          <small>
            Free key at{' '}
            <a href="https://openei.org/services/" target="_blank" rel="noreferrer">
              openei.org/services
            </a>
          </small>
        </label>
        <button type="button" onClick={lookupRates} disabled={loadingRates} className="secondary">
          {loadingRates ? 'Looking up…' : 'Look up rate plans'}
        </button>
        {rateError && <p className="error">{rateError}</p>}

        {rates.length > 0 && (
          <label>
            Select Rate Plan
            <select
              value={form.rateplanId ?? ''}
              onChange={(e) => {
                const plan = rates.find((r) => r.id === e.target.value) ?? null;
                set('rateplanId', e.target.value);
                set('rateplan', plan);
              }}
            >
              <option value="">— choose a plan —</option>
              {rates.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.utility}) — ${r.flatRate.toFixed(4)}/kWh base
                  {r.isTOU ? ' [TOU]' : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        {!rates.length && form.rateplan && (
          <p className="saved-rate">
            Current plan: <strong>{form.rateplan.name}</strong>
          </p>
        )}

      </section>

      <button type="submit" className="primary">Save Settings</button>
    </form>
  );
}
