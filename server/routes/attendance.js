const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, Attendance, Settings } = require('../models');
const { authMiddleware, requireRole, requireCompany } = require('../middleware/auth');
const { calculateDistance } = require('../helpers/validation');

// Settings cache (now per-company)
const settingsCache = {};
async function getDynamicSetting(key, defaultValue, companyId = null) {
  const cacheKey = `${companyId || 'global'}_${key}`;
  const cached = settingsCache[cacheKey];
  if (cached && (Date.now() - cached.timestamp < 5 * 60 * 1000)) return cached.value;
  try {
    // Try company-specific setting first, then global
    let setting = null;
    if (companyId) {
      setting = await Settings.findOne({ where: { key, companyId } });
    }
    if (!setting) {
      setting = await Settings.findOne({ where: { key, companyId: null } });
    }
    const value = (setting && setting.value !== undefined && setting.value !== null) ? setting.value : defaultValue;
    settingsCache[cacheKey] = { value, timestamp: Date.now() };
    return value;
  } catch (e) { return defaultValue; }
}

// Submit Attendance
router.post('/attendance/submit', authMiddleware, requireCompany, async (req, res) => {
  try {
    const { lat, lng, type } = req.body;
    const clockType = type || 'clock_in';
    const now = new Date();
    const jakartaTime = now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false });
    const timePart = jakartaTime.split(', ')[1];
    if (timePart && clockType === 'clock_in') {
      const [h, m] = timePart.split(':').map(Number);
      if (h < 7) return res.status(400).json({ success: false, message: `Absensi Gagal: Jam operasional absen masuk dimulai pukul 07:00 WIB. (Sekarang ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} WIB)` });
    }
    if (lat === undefined || lng === undefined) return res.status(400).json({ success: false, message: 'Koordinat GPS diperlukan.' });
    if (type && !['clock_in', 'clock_out'].includes(type)) return res.status(400).json({ success: false, message: 'Tipe absensi tidak valid.' });

    // Get company-specific office location
    const office = await getDynamicSetting('office_location', { lat: -6.1528, lng: 106.7909, radius: 100, name: 'Office' }, req.user.companyId);
    const distance = calculateDistance(Number(lat), Number(lng), Number(office.lat), Number(office.lng));
    const allowedRadius = Number(office.radius || 100);

    if (distance > allowedRadius) {
      return res.status(400).json({ success: false, message: `Absensi Gagal: Anda berada di luar radius kantor! Jarak Anda: ${Math.round(distance)} meter dari titik kantor, sedangkan batas maksimal adalah ${allowedRadius} meter.`, debug: { distance: Math.round(distance), radius: allowedRadius } });
    }

    const absenBaru = await Attendance.create({
      userId: req.user.id, companyId: req.user.companyId,
      email: req.user.email, name: req.user.name,
      profilePicture: req.user.profilePicture, latitude: lat, longitude: lng, type: clockType,
    });

    res.status(200).json({ success: true, message: `Absensi ${req.user.name} berhasil dicatat!`, attendance: { email: req.user.email, name: req.user.name, latitude: lat, longitude: lng, type: clockType, timestamp: absenBaru.timestamp } });
  } catch (error) {
    console.error('Attendance error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mencatat absensi.' });
  }
});

// Attendance History
router.get('/attendance/history', authMiddleware, requireCompany, async (req, res) => {
  try {
    const { email, month, year } = req.query;
    const isPrivileged = ['super_admin', 'admin', 'manager', 'hrd'].includes(req.user.role);
    const targetEmail = isPrivileged ? (email || req.user.email) : req.user.email;
    const where = { email: { [Op.iLike]: targetEmail.trim() } };

    // Company isolation
    if (req.user.role !== 'super_admin') {
      where.companyId = req.user.companyId;
    }

    if (month !== undefined && year !== undefined) {
      const start = new Date(year, month, 1);
      const end = new Date(year, parseInt(month) + 1, 0, 23, 59, 59);
      where.timestamp = { [Op.between]: [start, end] };
    }
    const records = await Attendance.findAll({ where, order: [['timestamp', 'DESC']], limit: 100 });
    res.status(200).json({ success: true, records });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mengambil riwayat.' });
  }
});

// Summary Today
router.get('/attendance/summary/today', authMiddleware, requireCompany, async (req, res) => {
  try {
    const jakartaDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const start = new Date(`${jakartaDateStr}T00:00:00.000+07:00`);
    const end = new Date(`${jakartaDateStr}T23:59:59.999+07:00`);

    // Company isolation
    const companyFilter = {};
    if (req.user.role !== 'super_admin') {
      companyFilter.companyId = req.user.companyId;
    }

    const totalStaff = await User.count({ where: companyFilter });
    const todayRecords = await Attendance.findAll({ where: { timestamp: { [Op.between]: [start, end] }, ...companyFilter } });

    const usersAttendance = {};
    todayRecords.forEach(r => {
      if (!usersAttendance[r.email]) usersAttendance[r.email] = { in: false, out: false };
      if (r.type === 'clock_in') usersAttendance[r.email].in = true;
      if (r.type === 'clock_out') usersAttendance[r.email].out = true;
    });
    const isBefore7PM = new Date().getHours() < 19;
    const presentCount = Object.values(usersAttendance).filter(u => u.in && (u.out || isBefore7PM)).length;

    const lateThresholdMinutes = 9 * 60 + 15;
    const userFirstIn = {};
    todayRecords.forEach(r => {
      if (r.type === 'clock_in') {
        if (!userFirstIn[r.email] || new Date(r.timestamp) < new Date(userFirstIn[r.email])) userFirstIn[r.email] = r.timestamp;
      }
    });
    const lateCount = Object.values(userFirstIn).filter(time => {
      const d = new Date(time);
      const jt = d.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false });
      const tp = jt.split(', ')[1];
      if (!tp) return false;
      const [h, m] = tp.split(':').map(Number);
      return (h * 60 + m) > lateThresholdMinutes;
    }).length;

    res.status(200).json({ success: true, totalStaff, presentCount, lateCount });
  } catch (error) {
    console.error('Summary error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil ringkasan absensi.' });
  }
});

// Monthly Report
router.get('/attendance/summary/monthly', authMiddleware, requireCompany, requireRole('super_admin', 'admin', 'manager', 'hrd'), async (req, res) => {
  try {
    const { month, year } = req.query;
    const start = new Date(year, month, 1);
    const end = new Date(year, parseInt(month) + 1, 0, 23, 59, 59);

    // Company isolation
    const companyFilter = {};
    if (req.user.role !== 'super_admin') {
      companyFilter.companyId = req.user.companyId;
    }

    const users = await User.findAll({ where: companyFilter, order: [['name', 'ASC']] });
    const attendance = await Attendance.findAll({ where: { timestamp: { [Op.between]: [start, end] }, ...companyFilter } });
    const lateThresholdMinutes = 9 * 60 + 15;

    const attendanceMap = {};
    attendance.forEach(a => {
      const email = a.email.toLowerCase();
      if (!attendanceMap[email]) attendanceMap[email] = [];
      attendanceMap[email].push(a);
    });

    const reports = users.map(user => {
      const userAtt = attendanceMap[user.email.toLowerCase()] || [];
      const days = {};
      userAtt.forEach(a => {
        const d = new Date(a.timestamp);
        const dKey = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
        if (!days[dKey]) days[dKey] = { in: null, out: null };
        if (a.type === 'clock_in' && (!days[dKey].in || new Date(a.timestamp) < new Date(days[dKey].in))) days[dKey].in = a.timestamp;
        if (a.type === 'clock_out' && (!days[dKey].out || new Date(a.timestamp) > new Date(days[dKey].out))) days[dKey].out = a.timestamp;
      });

      let totalHours = 0, daysPresent = 0, lateDays = 0;
      const jakartaTodayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      const nowJakarta = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));

      Object.entries(days).forEach(([dateStr, times]) => {
        const isToday = dateStr === jakartaTodayStr;
        const isPast7PM = nowJakarta.getHours() >= 19;
        let isValid = false;
        if (times.in && times.out) { isValid = true; totalHours += Math.abs(new Date(times.out) - new Date(times.in)) / (1000 * 60 * 60); }
        else if (times.in && isToday && !isPast7PM) { isValid = true; }
        if (isValid) {
          daysPresent++;
          const d = new Date(times.in);
          const jt = d.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false });
          const tp = jt.split(', ')[1];
          if (tp) { const [h, m] = tp.split(':').map(Number); if ((h * 60 + m) > lateThresholdMinutes) lateDays++; }
        }
      });

      return { id: user.id, name: user.name, email: user.email, position: user.position || 'Employee', profilePicture: user.profilePicture || null, daysPresent, lateDays, totalHours: totalHours.toFixed(1), attendanceRate: ((daysPresent / 22) * 100).toFixed(0) };
    });
    res.json({ success: true, reports });
  } catch (error) {
    console.error('Monthly report error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil laporan bulanan.' });
  }
});

// Daily Report
router.get('/attendance/summary/daily', authMiddleware, requireCompany, requireRole('super_admin', 'admin', 'manager', 'hrd'), async (req, res) => {
  try {
    const { date } = req.query;
    const dateStr = date || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const startOfDay = new Date(`${dateStr}T00:00:00.000+07:00`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999+07:00`);

    // Company isolation
    const companyFilter = {};
    if (req.user.role !== 'super_admin') {
      companyFilter.companyId = req.user.companyId;
    }

    const users = await User.findAll({ where: companyFilter, attributes: ['id', 'name', 'email', 'position', 'department', 'profilePicture', 'role'], order: [['name', 'ASC']] });
    const attendance = await Attendance.findAll({ where: { timestamp: { [Op.between]: [startOfDay, endOfDay] }, ...companyFilter } });
    const lateThresholdMinutes = 9 * 60 + 15;

    const attendanceMap = {};
    attendance.forEach(a => { const email = a.email.toLowerCase(); if (!attendanceMap[email]) attendanceMap[email] = []; attendanceMap[email].push(a); });

    const reports = users.map(user => {
      const userAtt = attendanceMap[user.email.toLowerCase()] || [];
      let clockIn = null, clockOut = null;
      userAtt.forEach(a => {
        if (a.type === 'clock_in' && (!clockIn || new Date(a.timestamp) < new Date(clockIn))) clockIn = a.timestamp;
        if (a.type === 'clock_out' && (!clockOut || new Date(a.timestamp) > new Date(clockOut))) clockOut = a.timestamp;
      });
      let workHours = 0;
      if (clockIn && clockOut) workHours = Math.abs(new Date(clockOut) - new Date(clockIn)) / (1000 * 60 * 60);
      let isLate = false;
      if (clockIn) {
        const d = new Date(clockIn);
        const jt = d.toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour12: false });
        const tp = jt.split(', ')[1];
        if (tp) { const [h, m] = tp.split(':').map(Number); isLate = (h * 60 + m) > lateThresholdMinutes; }
      }
      let status = 'absent';
      if (clockIn && clockOut) status = 'complete';
      else if (clockIn) status = 'working';
      return { id: user.id, name: user.name, email: user.email, position: user.position || 'Employee', department: user.department || '-', profilePicture: user.profilePicture || null, role: user.role, clockIn, clockOut, workHours: workHours.toFixed(2), isLate, status };
    });
    res.json({ success: true, reports, date: dateStr });
  } catch (error) {
    console.error('Daily report error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil laporan harian.' });
  }
});

module.exports = router;
module.exports.getDynamicSetting = getDynamicSetting;
