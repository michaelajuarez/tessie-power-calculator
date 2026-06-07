require('dotenv').config();
const express = require('express');
const cors = require('cors');

const tessieRoutes = require('./routes/tessie');
const ratesRoutes = require('./routes/rates');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/tessie', tessieRoutes);
app.use('/api/rates', ratesRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
