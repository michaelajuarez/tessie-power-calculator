import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const fmtCost = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function groupByMonth(sessions) {
  const map = {};
  for (const s of sessions) {
    if (!s.started_at) continue;
    const d = new Date(s.started_at * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    if (!map[key]) map[key] = { key, label, kwh: 0, cost: 0, sessions: 0 };
    map[key].kwh += s.energy_added ?? 0;
    map[key].cost += s.cost ?? 0;
    map[key].sessions += 1;
  }
  return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
}

export default function CostSummary({ sessions }) {
  const monthly = useMemo(() => groupByMonth(sessions), [sessions]);

  if (!sessions.length) return null;

  const totalKwh = sessions.reduce((s, r) => s + (r.energy_added ?? 0), 0);
  const totalCost = sessions.reduce((s, r) => s + (r.cost ?? 0), 0);
  const hasCost = totalCost > 0;

  return (
    <div className="cost-summary">
      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-label">Total Energy</span>
          <span className="stat-value">{totalKwh.toFixed(1)} kWh</span>
        </div>
        {hasCost && (
          <div className="stat-card highlight">
            <span className="stat-label">Total Cost</span>
            <span className="stat-value">{fmtCost.format(totalCost)}</span>
          </div>
        )}
        {hasCost && (
          <div className="stat-card">
            <span className="stat-label">Avg Cost / Session</span>
            <span className="stat-value">
              {fmtCost.format(totalCost / sessions.length)}
            </span>
          </div>
        )}
        {hasCost && totalKwh > 0 && (
          <div className="stat-card">
            <span className="stat-label">Avg Rate Paid</span>
            <span className="stat-value">
              {((totalCost / totalKwh) * 100).toFixed(1)}¢/kWh
            </span>
          </div>
        )}
      </div>

      <h3>Monthly Breakdown</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={monthly} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="kwh" orientation="left" unit=" kWh" tick={{ fontSize: 12 }} />
          {hasCost && (
            <YAxis yAxisId="cost" orientation="right" tickFormatter={(v) => `$${v.toFixed(0)}`} tick={{ fontSize: 12 }} />
          )}
          <Tooltip
            formatter={(val, name) =>
              name === 'cost' ? [fmtCost.format(val), 'Cost'] : [`${val.toFixed(1)} kWh`, 'Energy']
            }
          />
          <Legend />
          <Bar yAxisId="kwh" dataKey="kwh" name="kWh" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          {hasCost && (
            <Bar yAxisId="cost" dataKey="cost" name="cost" fill="#10b981" radius={[4, 4, 0, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
