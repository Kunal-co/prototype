const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
const origins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map(s => s.trim());

app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve frontend files in production/development
if (!process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, '..', 'frontend')));
}

// API routes
app.use('/api', require('./routes'));

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  if (!process.env.VERCEL) {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
    }
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;