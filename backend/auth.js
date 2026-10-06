const crypto = require('crypto');
const db = require('./db');

const SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

function encodePayload(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function sign(payload) {
  return crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('base64url');
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto
    .scryptSync(password, salt, 32)
    .toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  try {
    const [salt] = storedHash.split(':');
    const hashedInput = crypto
      .scryptSync(password, salt, 32)
      .toString('hex');
    const expected = `${salt}:${hashedInput}`;
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(storedHash)
    );
  } catch {
    return false;
  }
}

async function seedAdmin() {
  try {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    const existingUser = await db.getUserByUsername(username);
    if (!existingUser) {
      const id = crypto.randomUUID();
      const hash = hashPassword(password);
      await db.createUser(id, username, hash);
      console.log(`Admin user created: ${username}`);
    }
  } catch (error) {
    console.error('Error seeding admin:', error);
  }
}

async function login(username, password) {
  try {
    if (!username || !password) {
      return null;
    }

    const user = await db.getUserByUsername(String(username));
    if (!user || !verifyPassword(String(password), user.password_hash)) {
      return null;
    }

    const payload = encodePayload({
      id: user.id,
      username: user.username,
      exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });

    const token = `${payload}.${sign(payload)}`;

    return {
      user: {
        id: user.id,
        username: user.username
      },
      token
    };
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
}

function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing token' }
      });
    }

    const [payloadPart, signaturePart] = token.split('.');

    if (!payloadPart || !signaturePart || signaturePart !== sign(payloadPart)) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid token' }
      });
    }

    const decoded = JSON.parse(Buffer.from(payloadPart, 'base64url'));

    if (decoded.exp < Date.now()) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Token expired' }
      });
    }

    req.user = {
      id: decoded.id,
      username: decoded.username
    };

    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid token' }
    });
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  login,
  seedAdmin,
  requireAuth
};