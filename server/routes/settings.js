const express = require('express');
const router = express.Router();
const { Settings, PayrollSettings } = require('../models');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { RATES } = require('../services/payrollEngine');

// GET Office Settings
router.get('/office', authMiddleware, async (req, res) => {
  try {
    const setting = await Settings.findOne({ where: { key: 'office_location' } });
    if (!setting) return res.json({ success: true, data: { lat: -6.1528, lng: 106.7909, radius: 100, name: 'EMS Office' } });
    res.json({ success: true, data: setting.value });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to get settings.' }); }
});

// PUT Office Settings
router.put('/office', authMiddleware, requireRole('admin', 'hrd'), async (req, res) => {
  try {
    const { lat, lng, radius, name } = req.body;
    const parsedLat = parseFloat(lat), parsedLng = parseFloat(lng), parsedRadius = parseInt(radius) || 100;
    if (isNaN(parsedLat) || isNaN(parsedLng) || parsedLat < -90 || parsedLat > 90 || parsedLng < -180 || parsedLng > 180)
      return res.status(400).json({ success: false, message: 'Koordinat tidak valid.' });
    if (parsedRadius < 10 || parsedRadius > 5000)
      return res.status(400).json({ success: false, message: 'Radius harus antara 10-5000 meter.' });

    const value = { lat: parsedLat, lng: parsedLng, radius: parsedRadius, name: name || 'EMS Office' };
    await Settings.upsert({ key: 'office_location', value, updatedAt: new Date() });
    console.log(`✅ [SETTINGS] Office location updated: ${name} (${parsedLat}, ${parsedLng}) R:${parsedRadius}`);
    res.json({ success: true, message: 'Lokasi kantor diperbarui!', data: value });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to update settings.' }); }
});

// GET Work Days
router.get('/workdays', authMiddleware, async (req, res) => {
  try {
    const setting = await Settings.findOne({ where: { key: 'work_days' } });
    if (!setting) return res.json({ success: true, data: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] });
    res.json({ success: true, data: setting.value });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to get workdays.' }); }
});

// PUT Work Days
router.put('/workdays', authMiddleware, requireRole('admin', 'hrd'), async (req, res) => {
  try {
    const { days } = req.body;
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!Array.isArray(days) || days.some(d => !validDays.includes(d)))
      return res.status(400).json({ success: false, message: 'Hari kerja tidak valid.' });
    await Settings.upsert({ key: 'work_days', value: days });
    res.json({ success: true, message: 'Hari kerja diperbarui!', data: days });
  } catch (error) { res.status(500).json({ success: false, message: 'Failed to update workdays.' }); }
});

// GET Payroll Settings
router.get('/payroll', authMiddleware, requireRole('admin', 'hrd'), async (req, res) => {
  try {
    let settings = await PayrollSettings.findOne();
    if (!settings) settings = await PayrollSettings.create({});
    res.json({
      success: true,
      settings: {
        LATE_PENALTY_PER_DAY: Number(settings.latePenaltyPerDay) || 50000,
        OVERTIME_RATE_PER_HOUR: Number(settings.overtimeRatePerHour) || 30000,
        MEAL_ALLOWANCE_PER_DAY: Number(settings.mealAllowancePerDay) || 25000,
        TRANSPORT_ALLOWANCE_PER_DAY: Number(settings.transportAllowancePerDay) || 20000,
      },
      fullSettings: settings,
      defaults: RATES,
    });
  } catch (error) { console.error('Fetch payroll settings error:', error); res.status(500).json({ success: false, message: 'Failed to fetch payroll settings.' }); }
});

// PUT Payroll Settings
router.put('/payroll', authMiddleware, requireRole('admin', 'hrd'), async (req, res) => {
  try {
    const { key, value, settings: settingsBody } = req.body;
    const updateData = { updatedAt: new Date(), updatedBy: req.user.email };
    if (settingsBody) {
      if (settingsBody.LATE_PENALTY_PER_DAY !== undefined) updateData.latePenaltyPerDay = settingsBody.LATE_PENALTY_PER_DAY;
      if (settingsBody.OVERTIME_RATE_PER_HOUR !== undefined) updateData.overtimeRatePerHour = settingsBody.OVERTIME_RATE_PER_HOUR;
    } else if (key) {
      if (key === 'LATE_PENALTY_PER_DAY') updateData.latePenaltyPerDay = value;
      else if (key === 'OVERTIME_RATE_PER_HOUR') updateData.overtimeRatePerHour = value;
      else return res.status(400).json({ success: false, message: 'Setting key tidak dikenal.' });
    } else return res.status(400).json({ success: false, message: 'Data setting tidak valid.' });

    let existing = await PayrollSettings.findOne();
    if (existing) await existing.update(updateData);
    else await PayrollSettings.create(updateData);
    res.json({ success: true, message: 'Pengaturan payroll berhasil diperbarui.' });
  } catch (error) { console.error('Update payroll settings error:', error); res.status(500).json({ success: false, message: 'Gagal memperbarui settings.' }); }
});

module.exports = router;
