const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const sequelize = require('./db');

// Load models & associations
require('./models');

// Load routes
const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const employeesRoutes = require('./routes/employees');
const requestsRoutes = require('./routes/requests');
const payrollRoutes = require('./routes/payroll');
const settingsRoutes = require('./routes/settings');

// Services
const { initCronJobs } = require('./services/cronJobs');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// ============================================================
// SECURITY MIDDLEWARE SETUP
// ============================================================
app.use(helmet());

const allowedOrigins = [
  'http://localhost:5173',
  'https://hris-project-seven.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS: Origin tidak diizinkan'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak request. Coba lagi dalam 15 menit.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { success: false, message: 'Terlalu banyak percobaan login. Coba lagi nanti.' },
});
app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') return res.redirect(301, `https://${req.headers.host}${req.url}`);
    next();
  });
}

// ============================================================
// ROUTES
// ============================================================
app.use('/api', authRoutes);
app.use('/api', attendanceRoutes);
app.use('/api/employees', employeesRoutes);
// Profile route (needs to be before /api/requests to avoid conflict)
app.put('/api/users/profile', require('./middleware/auth').authMiddleware, async (req, res) => {
  const { validateProfileInput } = require('./helpers/validation');
  const { User } = require('./models');
  try {
    const { name, bio, phone, address, birthday, gender, maritalStatus } = req.body;
    const validationErrors = validateProfileInput(req.body);
    if (validationErrors.length > 0) return res.status(400).json({ success: false, message: validationErrors.join(', ') });
    await User.update({ name, bio, phone, address, birthday, gender, maritalStatus }, { where: { id: req.user.id } });
    const updatedUser = await User.findByPk(req.user.id);
    if (!updatedUser) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    res.status(200).json({ success: true, message: 'Profil berhasil diperbarui!', user: updatedUser });
  } catch (error) { console.error('Profile error:', error.message); res.status(500).json({ success: false, message: 'Gagal memperbarui profil.' }); }
});
app.use('/api/requests', requestsRoutes);
// Schedule route (lives under /api but not under /api/requests)
app.get('/api/schedule/holidays', require('./middleware/auth').authMiddleware, async (req, res) => {
  const ical = require('node-ical');
  try {
    const iCalUrl = 'https://calendar.google.com/calendar/ical/id.indonesian%23holiday%40group.v.calendar.google.com/public/basic.ics';
    ical.fromURL(iCalUrl, {}, function (err, data) {
      if (err) return res.status(500).json({ success: false, message: 'Failed to fetch calendar data' });
      const holidays = [];
      const currentYear = new Date().getFullYear();
      for (let k in data) {
        if (data.hasOwnProperty(k) && data[k].type === 'VEVENT') {
          const ev = data[k];
          const eventDate = new Date(ev.start);
          eventDate.setHours(eventDate.getHours() + 12);
          if (eventDate.getFullYear() === currentYear || eventDate.getFullYear() === currentYear + 1) {
            holidays.push({ date: eventDate.toISOString().split('T')[0], summary: ev.summary });
          }
        }
      }
      res.status(200).json({ success: true, holidays });
    });
  } catch (error) { res.status(500).json({ success: false, message: 'Server error parsing schedule' }); }
});
app.use('/api/payroll', payrollRoutes);
app.use('/api/settings', settingsRoutes);

// ============================================================
// DATABASE CONNECTION (PostgreSQL via Sequelize)
// ============================================================
sequelize.authenticate()
  .then(() => {
    console.log('✅ PostgreSQL connected');
    return sequelize.sync({ alter: true });
  })
  .then(() => {
    console.log('✅ Database tables synced');
    initCronJobs();
  })
  .catch(err => console.log('❌ Database error:', err.message));

// Export for Vercel Serverless Functions
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
}

module.exports = app;