const express = require('express');
const { getRatesByZip } = require('../services/openei');

const router = express.Router();

router.get('/lookup', async (req, res) => {
  const { zip } = req.query;
  if (!zip) return res.status(400).json({ error: 'zip is required' });

  const apiKey = req.headers['x-openei-key'] || process.env.OPENEI_API_KEY;
  if (!apiKey) return res.status(400).json({ error: 'Missing OpenEI API key' });

  try {
    const rates = await getRatesByZip(zip, apiKey);
    res.json(rates);
  } catch (err) {
    res.status(err.response?.status ?? 500).json({ error: err.message });
  }
});

module.exports = router;
