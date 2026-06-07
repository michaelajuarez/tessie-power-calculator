const axios = require('axios');

const BASE_URL = 'https://api.tessie.com';

function client(token) {
  return axios.create({
    baseURL: BASE_URL,
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function getVehicles(token) {
  const { data } = await client(token).get('/vehicles');
  return data.results ?? data;
}

async function getChargingHistory(token, vin, { after, before } = {}) {
  const { data } = await client(token).get(`/${vin}/charges`);
  let results = data.results ?? data;
  // Tessie ignores date params — filter client-side
  if (after) {
    const afterTs = Math.floor(new Date(after).getTime() / 1000);
    results = results.filter((s) => s.started_at >= afterTs);
  }
  if (before) {
    const beforeTs = Math.floor(new Date(before).getTime() / 1000);
    results = results.filter((s) => s.started_at <= beforeTs);
  }
  return results;
}

module.exports = { getVehicles, getChargingHistory };
