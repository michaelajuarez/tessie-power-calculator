import React, { useState } from 'react';
import { fetchRates } from '../api/client';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function deriveSeasonsFromPlan(plan) {
  if (!plan?.isTOU || !plan?.rateStructure?.weekdaySchedule) return [];
  const { weekdaySchedule } = plan.rateStructure;

  const groups = {};
  for (let m = 0; m < 12; m++) {
    const key = [...new Set(weekdaySchedule[m] ?? [])].sort().join(',');
    if (!groups[key]) groups[key] = { months: [] };
    groups[key].months.push(m);
  }

  return Object.values(groups)
    .map((g, i) => {
      const sorted = [...g.months].sort((a, b) => a - b);
      // Find start of consecutive run (after the largest gap)
      let maxGap = 0, startIdx = 0;
      for (let i = 0; i < sorted.length; i++) {
        const curr = sorted[i], next = sorted[(i + 1) % sorted.length];
        const gap = i === sorted.length - 1 ? (next + 12 - curr) : (next - curr);
        if (gap > maxGap) { maxGap = gap; startIdx = (i + 1) % sorted.length; }
      }
      const ordered = [...sorted.slice(startIdx), ...sorted.slice(0, startIdx)];
      return { id: i, startMonth: ordered[0], endMonth: ordered[ordered.length - 1], offPeak: '', midPeak: '', peak: '' };
    })
    .sort((a, b) => a.startMonth - b.startMonth);
}

export default function Settings({ settings, onSave }) {
  const [form, setForm] = useState(settings);
  const [rates, setRates] = useState([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [rateError, setRateError] = useState('');

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updateSeason(idx, field, value) {
    const seasons = [...(form.customSeasons ?? [])];
    seasons[idx] = { ...seasons[idx], [field]: value };
    set('customSeasons', seasons);
  }

  function addSeason() {
    const seasons = [...(form.customSeasons ?? [])];
    seasons.push({ id: Date.now(), startMonth: 0, endMonth: 0, offPeak: '', midPeak: '', peak: '' });
    set('customSeasons', seasons);
  }

  function removeSeason(idx) {
    const seasons = [...(form.customSeasons ?? [])];
    seasons.splice(idx, 1);
    set('customSeasons', seasons);
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
      // Restore rateplan object if we have a saved ID (it's stripped from localStorage)
      if (form.rateplanId) {
        const saved = data.find((r) => r.id === form.rateplanId);
        if (saved) {
          setForm((f) => ({
            ...f,
            rateplan: saved,
            customSeasons: f.customSeasons?.length ? f.customSeasons : deriveSeasonsFromPlan(saved),
          }));
        }
      }
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

  const customSeasons = form.customSeasons ?? [];
  const isTOU = form.rateplan?.isTOU;

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
                set('periodRates', {});
                set('customSeasons', plan ? deriveSeasonsFromPlan(plan) : []);
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
          <p className="saved-rate">Current plan: <strong>{form.rateplan.name}</strong></p>
        )}

        {isTOU && (
          <div className="season-editor">
            <div className="season-editor-header">
              <p className="period-rates-label">
                Enter your actual rates per season from your bill.
              </p>
              <button type="button" className="secondary" onClick={addSeason}>+ Add Season</button>
            </div>
            {customSeasons.map((season, i) => (
              <div key={season.id ?? i} className="season-card">
                <div className="season-card-header">
                  <select
                    value={season.startMonth}
                    onChange={(e) => updateSeason(i, 'startMonth', Number(e.target.value))}
                  >
                    {MONTH_NAMES.map((m, mi) => <option key={mi} value={mi}>{m}</option>)}
                  </select>
                  <span className="season-dash">–</span>
                  <select
                    value={season.endMonth}
                    onChange={(e) => updateSeason(i, 'endMonth', Number(e.target.value))}
                  >
                    {MONTH_NAMES.map((m, mi) => <option key={mi} value={mi}>{m}</option>)}
                  </select>
                  <button type="button" className="remove-btn" onClick={() => removeSeason(i)}>×</button>
                </div>
                <label>
                  Off-Peak (¢/kWh)
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 53.0"
                    value={season.offPeak}
                    onChange={(e) => updateSeason(i, 'offPeak', e.target.value)}
                  />
                </label>
                <label>
                  Mid-Peak (¢/kWh)
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="leave blank if none"
                    value={season.midPeak}
                    onChange={(e) => updateSeason(i, 'midPeak', e.target.value)}
                  />
                </label>
                <label>
                  Peak (¢/kWh)
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 64.0"
                    value={season.peak}
                    onChange={(e) => updateSeason(i, 'peak', e.target.value)}
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </section>

      <button type="submit" className="primary">Save Settings</button>
    </form>
  );
}
