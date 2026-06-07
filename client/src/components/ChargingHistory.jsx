import React from 'react';

const fmt = new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric',
  hour: 'numeric', minute: '2-digit',
});

const fmtCost = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 2,
});

export default function ChargingHistory({ sessions, loading, error }) {
  if (loading) return <p className="status">Loading charging history…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!sessions.length) return <p className="status">No charging sessions found.</p>;

  const totalKwh = sessions.reduce((s, r) => s + (r.kwh ?? 0), 0);
  const totalCost = sessions.reduce((s, r) => s + (r.cost ?? 0), 0);

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Location</th>
            <th>kWh Added</th>
            <th>Cost</th>
            <th>Rate Plan</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s, i) => (
            <tr key={s.id ?? i}>
              <td>{s.started_at ? fmt.format(new Date(s.started_at * 1000)) : '—'}</td>
              <td>{s.saved_location ?? s.location ?? '—'}</td>
              <td>{(s.energy_added ?? 0).toFixed(2)}</td>
              <td>{s.cost != null ? fmtCost.format(s.cost) : '—'}</td>
              <td>{s.rateLabel ?? '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2}><strong>Total</strong></td>
            <td><strong>{totalKwh.toFixed(2)} kWh</strong></td>
            <td><strong>{totalCost > 0 ? fmtCost.format(totalCost) : '—'}</strong></td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
