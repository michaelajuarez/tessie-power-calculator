export function calcSessionsCost(sessions, rateplan) {
  return sessions.map((s) => ({ ...s, ...calcSessionCost(s, rateplan) }));
}

function monthInSeason(month, season) {
  if (season.startMonth <= season.endMonth) {
    return month >= season.startMonth && month <= season.endMonth;
  }
  return month >= season.startMonth || month <= season.endMonth;
}

// Classify a period index as 'offPeak' | 'midPeak' | 'peak' based on sorted OpenEI rates
function classifyPeriod(periodIdx, energyratestructure) {
  const all = energyratestructure
    .map((tiers, idx) => {
      const last = tiers[tiers.length - 1] ?? {};
      return { idx, rate: (last.rate ?? 0) + (last.adj ?? 0) };
    })
    .sort((a, b) => a.rate - b.rate);
  const rank = all.findIndex((p) => p.idx === periodIdx);
  if (all.length <= 1 || rank === 0) return 'offPeak';
  if (rank === all.length - 1) return 'peak';
  return 'midPeak';
}

function getCustomRate(month, periodIdx, rateplan) {
  const seasons = rateplan.customSeasons;
  if (!seasons?.length) return null;

  const season = seasons.find((s) => monthInSeason(month, s));
  if (!season) return null;

  const periodType = classifyPeriod(periodIdx, rateplan.rateStructure?.energyratestructure ?? []);
  const val = season[periodType];
  if (val === '' || val == null) return null;
  return parseFloat(val) / 100;
}

function calcSessionCost(session, rateplan) {
  const kwh = session.energy_used ?? session.energy_added ?? 0;
  if (!rateplan) return { kwh, cost: null, rateLabel: 'No rate selected' };

  if (!rateplan.isTOU || !rateplan.rateStructure?.energyratestructure) {
    return { kwh, cost: kwh * (rateplan.flatRate ?? 0), rateLabel: rateplan.name };
  }

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

    let hourRate = getCustomRate(month, periodIdx, rateplan);
    if (hourRate == null) {
      const override = rateplan.periodRates?.[periodIdx];
      if (override != null) {
        hourRate = override;
      } else {
        const tier = period[period.length - 1] ?? period[0] ?? {};
        hourRate = (tier.rate ?? 0) + (tier.adj ?? 0) || rateplan.flatRate || 0;
      }
    }

    const sliceHrs = Math.min(stepMs, endMs - t) / 3_600_000;
    totalCost += kwhPerHour * sliceHrs * hourRate;
    t += stepMs;
  }

  return { kwh, cost: totalCost, rateLabel: rateplan.name };
}
