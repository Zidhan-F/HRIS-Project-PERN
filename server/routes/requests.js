const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, Request } = require('../models');
const { authMiddleware, requireRole, requireCompany } = require('../middleware/auth');
const { validateRequestInput } = require('../helpers/validation');
const ical = require('node-ical');

// Submit Request
router.post('/', authMiddleware, requireCompany, async (req, res) => {
  try {
    const { type, startDate, endDate, reason, amount } = req.body;
    console.log(`📝 New request: type=${type}, user=${req.user.email}, company=${req.user.companyId}`);
    const validationErrors = validateRequestInput(req.body);
    if (validationErrors.length > 0) {
      console.log('❌ Validation errors:', validationErrors);
      return res.status(400).json({ success: false, message: validationErrors.join(', ') });
    }
    const newRequest = await Request.create({
      userId: req.user.id, companyId: req.user.companyId,
      email: req.user.email, name: req.user.name,
      type, startDate: startDate || new Date(), endDate: endDate || startDate || new Date(), reason, amount: amount || null,
    });
    console.log(`✅ Request created: id=${newRequest.id}`);
    res.status(201).json({ success: true, message: 'Request submitted successfully!', request: newRequest });
  } catch (error) {
    console.error('❌ Request submit error:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Failed to submit request: ' + error.message });
  }
});

// Personal Requests
router.get('/', authMiddleware, async (req, res) => {
  try {
    const requests = await Request.findAll({ where: { email: { [Op.iLike]: req.user.email.trim() } }, order: [['timestamp', 'DESC']] });
    res.status(200).json({ success: true, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch personal requests.' });
  }
});

// Pending Requests (Admin/Manager/HRD) — filtered by company
router.get('/pending', authMiddleware, requireCompany, requireRole('super_admin', 'admin', 'manager', 'hrd'), async (req, res) => {
  try {
    const where = { status: 'Pending' };
    // Company isolation
    if (req.user.role !== 'super_admin') {
      where.companyId = req.user.companyId;
    }

    const requests = await Request.findAll({
      where, order: [['timestamp', 'DESC']],
      include: [{ model: User, as: 'user', attributes: ['profilePicture'] }],
    });
    const result = requests.map(r => {
      const obj = r.toJSON();
      obj.profilePicture = obj.user ? obj.user.profilePicture : null;
      delete obj.user;
      return obj;
    });
    res.status(200).json({ success: true, requests: result });
  } catch (error) {
    console.error('Pending requests error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch pending requests.' });
  }
});

// Active Leave Today — filtered by company
router.get('/active-leave', authMiddleware, requireCompany, async (req, res) => {
  try {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const where = {
      status: 'Approved', type: { [Op.in]: ['Leave', 'Sick', 'Permit'] },
      startDate: { [Op.lte]: todayEnd }, endDate: { [Op.gte]: todayStart },
    };
    // Company isolation
    if (req.user.role !== 'super_admin') {
      where.companyId = req.user.companyId;
    }

    const activeLeaves = await Request.findAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['profilePicture'] }],
    });
    const result = activeLeaves.map(r => { const obj = r.toJSON(); obj.profilePicture = obj.user ? obj.user.profilePicture : null; delete obj.user; return obj; });
    res.status(200).json({ success: true, count: result.length, data: result });
  } catch (error) {
    console.error('Active leave error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch active leaves.' });
  }
});

// Recent Requests Feed — filtered by company
router.get('/recent', authMiddleware, requireCompany, async (req, res) => {
  try {
    const where = { type: { [Op.in]: ['Leave', 'Sick', 'Permit'] } };
    // Company isolation
    if (req.user.role !== 'super_admin') {
      where.companyId = req.user.companyId;
    }

    const recentRequests = await Request.findAll({
      where,
      order: [['timestamp', 'DESC']], limit: 10,
      include: [{ model: User, as: 'user', attributes: ['profilePicture'] }],
    });
    const result = recentRequests.map(r => { const obj = r.toJSON(); obj.profilePicture = obj.user ? obj.user.profilePicture : null; delete obj.user; return obj; });
    res.status(200).json({ success: true, activities: result });
  } catch (error) {
    console.error('Recent requests error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch recent activities.' });
  }
});

// Update Request Status
router.put('/:id/status', authMiddleware, requireCompany, requireRole('super_admin', 'admin', 'manager', 'hrd'), async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;
    if (!['Approved', 'Rejected', 'Returned'].includes(status)) return res.status(400).json({ success: false, message: 'Status tidak valid.' });

    const oldRequest = await Request.findByPk(id);
    if (!oldRequest) return res.status(404).json({ success: false, message: 'Request not found.' });

    // Company isolation
    if (req.user.role !== 'super_admin' && oldRequest.companyId !== req.user.companyId) {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }

    let unpaidDays = 0, isUnpaid = false;
    if (status === 'Approved' && oldRequest.status !== 'Approved' && oldRequest.type === 'Leave') {
      const user = await User.findOne({ where: { email: { [Op.iLike]: oldRequest.email } } });
      if (user) {
        const start = new Date(oldRequest.startDate);
        const end = new Date(oldRequest.endDate);
        const requestedDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
        const currentQuota = Math.max(0, user.leaveQuota || 0);
        const paidDays = Math.min(requestedDays, currentQuota);
        unpaidDays = Math.max(0, requestedDays - paidDays);
        isUnpaid = unpaidDays > 0;
        if (paidDays > 0) {
          await User.update({ leaveQuota: Math.max(0, currentQuota - paidDays) }, { where: { email: { [Op.iLike]: oldRequest.email } } });
        }
      }
    }

    await oldRequest.update({ status, unpaidDays, isUnpaid });
    res.status(200).json({ success: true, message: `Request ${status}!`, request: oldRequest });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update request status.' });
  }
});

// Schedule & Holidays
router.get('/schedule/holidays', authMiddleware, async (req, res) => {
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
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error parsing schedule' });
  }
});

module.exports = router;
