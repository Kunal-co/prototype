// Stateless auth (HMAC-signed token) so it works across serverless invocations.
const crypto = require('crypto');
const db = require('./db');
const SECRET = process.env.JWT_SECRET || 'dev-only-secret';
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const sign = p => crypto.createHmac('sha256', SECRET).update(p).digest('base64url');
const hash = (pw, salt = crypto.randomBytes(16).toString('hex')) => salt + ':' + crypto.scryptSync(pw, salt, 32).toString('hex');
const verify = (pw, stored) => { const [s] = stored.split(':'); const a = Buffer.from(hash(pw, s)), b = Buffer.from(stored); return a.length === b.length && crypto.timingSafeEqual(a, b); };

async function seedAdmin() {
  const u = process.env.ADMIN_USERNAME || 'admin';
  if (!(await db.getUserByUsername(u))) await db.createUser(crypto.randomUUID(), u, hash(process.env.ADMIN_PASSWORD || 'admin123'));
}
async function login(username, password) {
  const u = username && password ? await db.getUserByUsername(String(username)) : null;
  if (!u || !verify(String(password), u.password_hash)) return null;
  const p = b64({ id: u.id, username: u.username, exp: Date.now() + 8 * 3600e3 });
  return { user: { id: u.id, username: u.username }, token: p + '.' + sign(p) };
}
function requireAuth(req, res, next) {
  const [p, s] = (req.headers.authorization || '').replace('Bearer ', '').split('.');
  try {
    if (!p || s !== sign(p)) throw 0;
    const d = JSON.parse(Buffer.from(p, 'base64url'));
    if (d.exp < Date.now()) throw 0;
    req.user = { id: d.id, username: d.username }; next();
  } catch { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } }); }
}
module.exports = { seedAdmin, login, requireAuth };
