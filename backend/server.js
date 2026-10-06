const express = require('express'), cors = require('cors'), path = require('path');
const app = express();
const origins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : false, allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '1mb' }));
app.use('/api', require('./routes'));
if (!process.env.VERCEL) app.use(express.static(path.join(__dirname, '..', 'frontend'))); // local dev only; Vercel serves static files itself
if (require.main === module) app.listen(process.env.PORT || 3000, () => console.log('http://localhost:' + (process.env.PORT || 3000)));
module.exports = app;
