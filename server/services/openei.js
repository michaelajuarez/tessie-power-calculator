const axios = require('axios');

const BASE_URL = 'https://api.openei.org/utility_rates';

async function getRatesByZip(zip, apiKey) {
  const { data } = await axios.get(BASE_URL, {
    params: {
      version: 7,
      format: 'json',
      detail: 'full',
      address: zip,
      limit: 100,
      current: true,
      approved: true,
      api_key: apiKey,
    },
  });

  const items = data.items ?? [];
  const mapped = items
    .filter((r) => r.sector === 'Residential' && r.energyratestructure)
    .map((r) => ({
      id: r.label,
      name: r.name,
      utility: r.utility,
      sector: r.sector,
      flatRate: extractFlatRate(r),
      maxRate: maxRateValue(r),
      isTOU: hasTOU(r),
      rateStructure: {
        energyratestructure: r.energyratestructure,
        weekdaySchedule: r.energyweekdayschedule ?? null,
        weekendSchedule: r.energyweekendschedule ?? null,
      },
    }));

  // Deduplicate by name — keep the version with the highest rates (most current)
  const best = {};
  for (const r of mapped) {
    const key = `${r.utility}||${r.name}`;
    if (!best[key] || r.maxRate > best[key].maxRate) best[key] = r;
  }
  return Object.values(best);
}

function maxRateValue(rate) {
  let max = 0;
  for (const period of rate.energyratestructure ?? []) {
    for (const tier of period) {
      max = Math.max(max, (tier.rate ?? 0) + (tier.adj ?? 0));
    }
  }
  return max;
}

function extractFlatRate(rate) {
  try {
    // Use the last (highest) tier of the first period as the representative flat rate.
    // SDG&E and many utilities store rate + adj as the two components of the full charge.
    const firstPeriod = rate.energyratestructure[0];
    const lastTier = firstPeriod[firstPeriod.length - 1];
    return (lastTier.rate ?? 0) + (lastTier.adj ?? 0);
  } catch {
    return 0;
  }
}

function hasTOU(rate) {
  const schedule = rate.energyweekdayschedule ?? [];
  if (!schedule.length) return false;
  const flat = schedule.flat();
  return new Set(flat).size > 1;
}

module.exports = { getRatesByZip };
