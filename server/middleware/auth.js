const { OAuth2Client } = require('google-auth-library');
const { User, Company } = require('../models');
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
    const user = await User.findOne({
      where: { email: { [Op.iLike]: userData.email.trim() } },
      include: [{ model: Company, as: 'company', attributes: ['id', 'name', 'code', 'status'] }],
    });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Akun Anda tidak ditemukan dalam sistem. Silakan hubungi pengelola sistem.' });
    }
    // Check if company is active (for non-super_admin users)
    if (user.role !== 'super_admin' && user.company && user.company.status === 'inactive') {
      return res.status(403).json({ success: false, message: 'Perusahaan Anda sedang nonaktif. Hubungi Super Admin.' });
    }
    req.user = user;
    req.companyId = user.companyId || null;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token tidak valid atau sudah kadaluarsa.' });
  }
}

// Middleware: Ensure user belongs to a company (skip for super_admin)
function requireCompany(req, res, next) {
  if (req.user.role === 'super_admin') return next();
  if (!req.user.companyId) {
    return res.status(403).json({ success: false, message: 'Anda belum ditempatkan ke perusahaan mana pun.' });
  }
  req.companyId = req.user.companyId;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Role tidak memiliki izin.' });
    }
    next();
  };
}

function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Akses ditolak. Hanya Super Admin yang dapat mengakses.' });
  }
  next();
}

// Check if user is the protected Root Admin
function isRootAdmin(user) {
  const rootEmail = (process.env.ROOT_ADMIN_EMAIL || '').toLowerCase().trim();
  return rootEmail && user.email.toLowerCase().trim() === rootEmail;
}

// Build company filter for queries (super_admin sees all, others see own company)
function getCompanyFilter(req) {
  if (req.user.role === 'super_admin') return {};
  return { companyId: req.user.companyId };
}

module.exports = { verifyGoogleToken, authMiddleware, requireRole, requireCompany, requireSuperAdmin, isRootAdmin, getCompanyFilter, googleClient };
