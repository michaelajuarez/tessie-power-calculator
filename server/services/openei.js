const axios = require('axios');

const BASE_URL = 'https://api.openei.org/utility_rates';

async function getRatesByZip(zip, apiKey) {
  const { data } = await axios.get(BASE_URL, {
    params: {
      version: 7,
      format: 'json',
      detail: 'full',
      address: zip,
      limit: 25,
      api_key: apiKey,
    },
  });

  const items = data.items ?? [];
  return items
    .filter((r) => r.sector === 'Residential' && r.energyratestructure)
    .map((r) => ({
      id: r.label,
      name: r.name,
      utility: r.utility,
      sector: r.sector,
      flatRate: extractFlatRate(r),
      isTOU: hasTOU(r),
      // Store the full structure needed for TOU lookups
      rateStructure: {
        energyratestructure: r.energyratestructure,
        weekdaySchedule: r.energyweekdayschedule ?? null,
        weekendSchedule: r.energyweekendschedule ?? null,
      },
    }));
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
