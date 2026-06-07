export function calcSessionsCost(sessions, rateplan) {
  return sessions.map((s) => ({ ...s, ...calcSessionCost(s, rateplan) }));
}

function calcSessionCost(session, rateplan) {
  const kwh = session.energy_added ?? 0;
  if (!rateplan) return { kwh, cost: null, rateLabel: 'No rate selected' };

  if (!rateplan.isTOU || !rateplan.rateStructure?.energyratestructure) {
    return { kwh, cost: kwh * (rateplan.flatRate ?? 0), rateLabel: rateplan.name };
  }

  // TOU: walk session hour-by-hour using the 12×24 schedule (month × hour)
  const startMs = (session.started_at ?? 0) * 1000;
  const endMs = (session.ended_at ?? 0) * 1000;
  const durationHrs = (endMs - startMs) / 3_600_000;
  if (durationHrs <= 0) {
    return { kwh, cost: kwh * (rateplan.flatRate ?? 0), rateLabel: rateplan.name };
  }

  const kwhPerHour = kwh / durationHrs;
  let totalCost = 0;
  const stepMs = 3_600_000;
  let t = startMs;

  while (t < endMs) {
    const dt = new Date(t);
    const month = dt.getMonth();
    const hour = dt.getHours();
    const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;

    const schedule = isWeekend
      ? rateplan.rateStructure.weekendSchedule
      : rateplan.rateStructure.weekdaySchedule;

    const periodIdx = schedule?.[month]?.[hour] ?? 0;
    const period = rateplan.rateStructure.energyratestructure[periodIdx] ?? [];
    // Use last (above-baseline) tier since EV charging typically exceeds daily baseline
    const tier = period[period.length - 1] ?? period[0] ?? {};
    const hourRate = (tier.rate ?? 0) + (tier.adj ?? 0) || rateplan.flatRate || 0;

    const sliceHrs = Math.min(stepMs, endMs - t) / 3_600_000;
    totalCost += kwhPerHour * sliceHrs * hourRate;
    t += stepMs;
  }

  return { kwh, cost: totalCost, rateLabel: rateplan.name };
}
