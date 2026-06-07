const express = require('express');
const { getVehicles, getChargingHistory } = require('../services/tessie');
const { calcSessionsCost } = require('../services/costCalc');

const router = express.Router();

function token(req) {
  const t = req.headers['x-tessie-token'] || process.env.TESSIE_API_TOKEN;
  if (!t) throw new Error('Missing Tessie API token');
  return t;
}

router.get('/vehicles', async (req, res) => {
  try {
    const vehicles = await getVehicles(token(req));
    res.json(vehicles);
  } catch (err) {
    res.status(err.response?.status ?? 500).json({ error: err.message });
  }
});

router.get('/vehicles/:vin/charging-history', async (req, res) => {
  try {
    const { vin } = req.params;
    const { after, before } = req.query;
    const sessions = await getChargingHistory(token(req), vin, { after, before });

    res.json(sessions);
  } catch (err) {
    res.status(err.response?.status ?? 500).json({ error: err.message });
  }
});

module.exports = router;
