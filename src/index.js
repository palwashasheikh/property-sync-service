require('dotenv').config();
const express = require('express');
const cors = require('cors');

const listingsRoutes = require('./api/listings.routes');
const syncRoutes = require('./api/sync.routes');
const { startScheduler } = require('./scheduler/sync.scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/listings', listingsRoutes);
app.use('/api/sync', syncRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Property Sync Service running on http://localhost:${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api/listings`);
  console.log(`   Sync stats: http://localhost:${PORT}/api/sync/stats\n`);

  // Start the sync scheduler
  startScheduler();
});

module.exports = app;
