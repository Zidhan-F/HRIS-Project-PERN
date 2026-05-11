const { OAuth2Client } = require('google-auth-library');
const { User } = require('../models');
const { Op } = require('sequelize');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(token) {
  const ticket = await googleClient.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  return {
    googleId: payload['sub'],
    email: payload['email'],
    name: payload['name'],
    picture: payload['picture'],
    emailVerified: payload['email_verified'],
  };
}

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Autentikasi diperlukan.' });
    }
    const token = authHeader.split('Bearer ')[1];
    const userData = await verifyGoogleToken(token);
    const user = await User.findOne({ where: { email: { [Op.iLike]: userData.email.trim() } } });
    if (!user) {
      return res.status(401).json({ success: false, message: 'User tidak terdaftar.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token tidak valid atau sudah kadaluarsa.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Role tidak memiliki izin.' });
    }
    next();
  };
}

module.exports = { verifyGoogleToken, authMiddleware, requireRole, googleClient };
