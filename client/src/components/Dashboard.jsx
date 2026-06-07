import React, { useEffect, useMemo, useState } from 'react';
import { fetchVehicles, fetchChargingHistory, fetchRates } from '../api/client';
import { calcSessionsCost } from '../services/costCalc';
import ChargingHistory from './ChargingHistory';
import CostSummary from './CostSummary';

const thisYear = new Date().getFullYear();
const defaultFrom = `${thisYear}-01-01`;
const defaultTo = new Date().toISOString().slice(0, 10);

function locationKey(s) {
  return s.saved_location || s.location || 'Unknown';
}

export default function Dashboard({ settings }) {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVin, setSelectedVin] = useState('');
  const [sessions, setSessions] = useState([]);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vehiclesError, setVehiclesError] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  useEffect(() => {
    if (!settings.tessieToken) return;
    fetchVehicles(settings)
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) {
          setVehiclesError('No vehicles found. Check your Tessie API token in Settings.');
          return;
        }
        setVehicles(data);
        setSelectedVin(data[0].vin);
        setVehiclesError('');
      })
      .catch((err) => setVehiclesError(err.message));
  }, [settings.tessieToken]);

  // Unique locations sorted by session count descending
  const locations = useMemo(() => {
    const counts = {};
    for (const s of sessions) {
      const k = locationKey(s);
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k]) => k);
  }, [sessions]);

  const filtered = useMemo(() => {
    if (!locationFilter) return sessions;
    return sessions.filter((s) => locationKey(s) === locationFilter);
  }, [sessions, locationFilter]);

  async function load() {
    if (!selectedVin) return;
    setLoading(true);
    setError('');
    setLocationFilter('');
    try {
      // Always fetch a fresh rate plan so we never use stale cached data
      let rateplan = settings.rateplan ?? null;
      if (settings.rateplanId && settings.zip && settings.openeiKey) {
        try {
          const rates = await fetchRates(settings, settings.zip);
          rateplan = rates.find((r) => r.id === settings.rateplanId) ?? rateplan;
        } catch {}
      }

      const raw = await fetchChargingHistory(settings, selectedVin, { after: from, before: to });
      const data = calcSessionsCost(raw, rateplan);
      setSessions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!settings.tessieToken) {
    return (
      <div className="empty-state">
        <p>Add your Tessie API token in Settings to get started.</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {vehiclesError && <p className="error">{vehiclesError}</p>}

      <div className="controls">
        {vehicles.length > 1 && (
          <label>
            Vehicle
            <select value={selectedVin} onChange={(e) => setSelectedVin(e.target.value)}>
              {vehicles.map((v) => (
                <option key={v.vin} value={v.vin}>
                  {v.last_state?.display_name ?? v.vin}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button className="primary" onClick={load} disabled={loading || !selectedVin}>
          {loading ? 'Loading…' : 'Load Data'}
        </button>
      </div>

      {locations.length > 0 && (
        <div className="location-filter">
          <span className="filter-label">Filter by location</span>
          <div className="location-chips">
            <button
              className={`chip ${!locationFilter ? 'active' : ''}`}
              onClick={() => setLocationFilter('')}
            >
              All ({sessions.length})
            </button>
            {locations.map((loc) => {
              const count = sessions.filter((s) => locationKey(s) === loc).length;
              return (
                <button
                  key={loc}
                  className={`chip ${locationFilter === loc ? 'active' : ''}`}
                  onClick={() => setLocationFilter(locationFilter === loc ? '' : loc)}
                >
                  {loc} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!settings.rateplan && filtered.length > 0 && (
        <p className="notice">
          Tip: select a rate plan in Settings to see cost calculations.
        </p>
      )}

      <CostSummary sessions={filtered} />
      <ChargingHistory sessions={filtered} loading={loading} error={error} />
    </div>
  );
}
