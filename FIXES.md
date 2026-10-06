// Stateless auth (HMAC-signed token) so it works across serverless invocations.
const crypto = require('crypto');
const db = require('./db');

const SECRET = process.env.JWT_SECRET || 'dev-only-secret';
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const sign = p => crypto.createHmac('sha256', SECRET).update(p).digest('base64url');
const hash = (pw, salt = crypto.randomBytes(16).toString('hex')) => salt + ':' + crypto.scryptSync(pw, salt, 32).toString('hex');

const verify = (pw, stored) => {
  if (!stored || typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt] = stored.split(':');
  if (!salt) return false;
  const expected = Buffer.from(hash(pw, salt));
  const actual = Buffer.from(stored);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
};

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  if (!(await db.getUserByUsername(username))) {
    await db.createUser(crypto.randomUUID(), username, hash(process.env.ADMIN_PASSWORD || 'admin123'));
  }
}

async function login(username, password) {
  const u = username && password ? await db.getUserByUsername(String(username)) : null;
  if (!u || !verify(String(password), u.password_hash)) return null;

  const payload = b64({ id: u.id, username: u.username, exp: Date.now() + 8 * 3600e3 });
  return { user: { id: u.id, username: u.username }, token: payload + '.' + sign(payload) };
}

function requireAuth(req, res, next) {
  const authHeader = (req.headers.authorization || '').trim();
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const rawToken = match ? match[1].trim() : null;

  if (!rawToken) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } });
  }

  const [payload, signature] = rawToken.split('.');
  try {
    if (!payload || !signature || signature !== sign(payload)) throw new Error('invalid signature');
    const decoded = JSON.parse(Buffer.from(payload, 'base64url'));
    if (!decoded || decoded.exp < Date.now()) throw new Error('expired');
    req.user = { id: decoded.id, username: decoded.username };
    return next();
  } catch {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } });
  }
}

module.exports = { seedAdmin, login, requireAuth };

