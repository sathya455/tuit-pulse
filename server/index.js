const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
dns.setDefaultResultOrder('ipv4first');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db/db');

const authRoutes = require('./routes/auth');
const batchRoutes = require('./routes/batches');
const studentRoutes = require('./routes/students');
const activityRoutes = require('./routes/activities');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/activities', activityRoutes);

// Health-check & PostgreSQL connection test route
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() AS server_time');
    res.json({
      status: 'TuitPulse API is live!',
      database: 'Connected to Neon PostgreSQL',
      time: result.rows[0].server_time,
    });
  } catch (err) {
    console.error('Database health check failed:', err);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

// Centralized fallback error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error.',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`TuitPulse server running on http://localhost:${PORT}`);
});

