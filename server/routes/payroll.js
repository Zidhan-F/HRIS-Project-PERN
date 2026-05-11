const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, Payroll, PayrollLog } = require('../models');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { calculateAllPayroll, generateBankTransferCSV, getMonthName } = require('../services/payrollEngine');
const { generatePayslipPDF } = require('../services/pdfGenerator');
const { sendBulkPayslips } = require('../services/emailService');
const { getCronStatus } = require('../services/cronJobs');

// Payroll Audit Logs
router.get('/logs', authMiddleware, requireRole('admin', 'hrd'), async (req, res) => {
  try {
    const logs = await PayrollLog.findAll({ order: [['timestamp', 'DESC']], limit: 50 });
    res.json({ success: true, logs });
  } catch (error) { res.status(500).json({ success: false, message: 'Gagal mengambil log payroll.' }); }
});

// Calculate Payroll
router.post('/calculate', authMiddleware, requireRole('admin', 'hrd'), async (req, res) => {
  try {
    const { month, year, ids } = req.body;
    const targetMonth = month !== undefined ? parseInt(month) : new Date().getMonth();
    const targetYear = year !== undefined ? parseInt(year) : new Date().getFullYear();
    if (targetMonth < 0 || targetMonth > 11 || targetYear < 2020 || targetYear > 2100)
      return res.status(400).json({ success: false, message: 'Bulan atau tahun tidak valid.' });
    const result = await calculateAllPayroll(targetMonth, targetYear, req.user.email, ids);
    res.json({ success: true, message: `Payroll ${getMonthName(targetMonth)} ${targetYear} berhasil dihitung untuk ${result.results.length} karyawan.`, data: { total: result.total, calculated: result.results.length, errors: result.errors.length, errorDetails: result.errors } });
  } catch (error) { console.error('Payroll calculate error:', error.message); res.status(500).json({ success: false, message: 'Gagal menghitung payroll.' }); }
});

// Get Payroll Records
router.get('/records', authMiddleware, requireRole('admin', 'hrd', 'manager'), async (req, res) => {
  try {
    const { month, year } = req.query;
    const targetMonth = month !== undefined ? parseInt(month) : new Date().getMonth();
    const targetYear = year !== undefined ? parseInt(year) : new Date().getFullYear();
    const records = await Payroll.findAll({ where: { periodMonth: targetMonth, periodYear: targetYear }, order: [['name', 'ASC']] });

    // Map to match old API format with nested period
    const mappedRecords = records.map(r => {
      const obj = r.toJSON();
      obj.period = { month: obj.periodMonth, year: obj.periodYear };
      obj.attendanceSummary = { daysPresent: obj.daysPresent, daysLate: obj.daysLateAtt, overtimeHours: obj.overtimeHoursAtt, totalWorkHours: obj.totalWorkHours };
      return obj;
    });

    const summary = {
      totalGross: mappedRecords.reduce((s, r) => s + Number(r.grossPay), 0),
      totalDeductions: mappedRecords.reduce((s, r) => s + Number(r.totalDeductions), 0),
      totalNet: mappedRecords.reduce((s, r) => s + Number(r.netPay), 0),
      totalEmployees: mappedRecords.length,
      statusCounts: { draft: mappedRecords.filter(r => r.status === 'Draft').length, finalized: mappedRecords.filter(r => r.status === 'Finalized').length, paid: mappedRecords.filter(r => r.status === 'Paid').length },
    };
    res.json({ success: true, records: mappedRecords, summary });
  } catch (error) { console.error('Payroll records error:', error.message); res.status(500).json({ success: false, message: 'Gagal mengambil data payroll.' }); }
});

// My Payslip
router.get('/my-payslip', authMiddleware, async (req, res) => {
  try {
    const { month, year } = req.query;
    const targetMonth = month !== undefined ? parseInt(month) : new Date().getMonth();
    const targetYear = year !== undefined ? parseInt(year) : new Date().getFullYear();
    const payslipRaw = await Payroll.findOne({ where: { email: { [Op.iLike]: req.user.email }, periodMonth: targetMonth, periodYear: targetYear } });

    const mapPayroll = (r) => {
      if (!r) return null;
      const obj = r.toJSON();
      obj.period = { month: obj.periodMonth, year: obj.periodYear };
      obj.attendanceSummary = { daysPresent: obj.daysPresent, daysLate: obj.daysLateAtt, overtimeHours: obj.overtimeHoursAtt, totalWorkHours: obj.totalWorkHours };
      return obj;
    };

    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const historyRaw = await Payroll.findAll({ where: { email: { [Op.iLike]: req.user.email }, calculatedAt: { [Op.gte]: sixMonthsAgo } }, order: [['periodYear', 'DESC'], ['periodMonth', 'DESC']], limit: 6 });

    res.json({ success: true, payslip: mapPayroll(payslipRaw), history: historyRaw.map(mapPayroll) });
  } catch (error) { console.error('My payslip error:', error.message); res.status(500).json({ success: false, message: 'Gagal mengambil payslip.' }); }
});

// Finalize Single
router.put('/:id/finalize', authMiddleware, requireRole('admin', 'hrd'), async (req, res) => {
  try {
    const record = await Payroll.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record tidak ditemukan.' });
    await record.update({ status: 'Finalized', updatedAt: new Date() });
    await PayrollLog.create({ action: 'FINALIZE_SINGLE', performedBy: req.user.name, periodMonth: record.periodMonth, periodYear: record.periodYear, details: `Finalized payroll for ${record.name}.` });
    const obj = record.toJSON(); obj.period = { month: obj.periodMonth, year: obj.periodYear };
    res.json({ success: true, message: `Payroll ${record.name} berhasil di-finalize.`, record: obj });
  } catch (error) { res.status(500).json({ success: false, message: 'Gagal finalize payroll.' }); }
});

// Finalize ALL
router.put('/finalize-all', authMiddleware, requireRole('admin', 'hrd'), async (req, res) => {
  try {
    const { month, year, ids } = req.body;
    const targetMonth = month !== undefined ? parseInt(month) : new Date().getMonth();
    const targetYear = year !== undefined ? parseInt(year) : new Date().getFullYear();
    const where = { periodMonth: targetMonth, periodYear: targetYear, status: 'Draft' };
    if (ids && ids.length > 0) where.id = { [Op.in]: ids };
    const [count] = await Payroll.update({ status: 'Finalized', updatedAt: new Date() }, { where });
    await PayrollLog.create({ action: 'FINALIZE_ALL', performedBy: req.user.name, periodMonth: targetMonth, periodYear: targetYear, entitiesCount: count, details: `Finalized ${count} payroll records.` });
    res.json({ success: true, message: `${count} payroll records di-finalize.`, modified: count });
  } catch (error) { res.status(500).json({ success: false, message: 'Gagal finalize semua payroll.' }); }
});

// Mark Paid Single
router.put('/:id/mark-paid', authMiddleware, requireRole('admin', 'hrd'), async (req, res) => {
  try {
    const record = await Payroll.findOne({ where: { id: req.params.id, status: 'Finalized' } });
    if (!record) return res.status(400).json({ success: false, message: 'Record tidak ditemukan atau belum berstatus Finalized.' });
    await record.update({ status: 'Paid', updatedAt: new Date() });
    await User.update({ payrollStatus: 'Paid' }, { where: { id: record.employeeId } });
    await PayrollLog.create({ action: 'MARK_PAID_SINGLE', performedBy: req.user.name, periodMonth: record.periodMonth, periodYear: record.periodYear, details: `Marked payroll for ${record.name} as PAID.` });
    const obj = record.toJSON(); obj.period = { month: obj.periodMonth, year: obj.periodYear };
    res.json({ success: true, message: `Payroll ${record.name} ditandai PAID.`, record: obj });
  } catch (error) { res.status(500).json({ success: false, message: 'Gagal mark as paid.' }); }
});

// Mark ALL Paid
router.put('/mark-all-paid', authMiddleware, requireRole('admin', 'hrd'), async (req, res) => {
  try {
    const { month, year, ids } = req.body;
    const targetMonth = month !== undefined ? parseInt(month) : new Date().getMonth();
    const targetYear = year !== undefined ? parseInt(year) : new Date().getFullYear();
    const where = { periodMonth: targetMonth, periodYear: targetYear, status: 'Finalized' };
    if (ids && ids.length > 0) where.id = { [Op.in]: ids };
    const records = await Payroll.findAll({ where, attributes: ['employeeId'] });
    const employeeIds = records.map(r => r.employeeId);
    await Payroll.update({ status: 'Paid', updatedAt: new Date() }, { where });
    if (employeeIds.length > 0) await User.update({ payrollStatus: 'Paid' }, { where: { id: { [Op.in]: employeeIds } } });
    await PayrollLog.create({ action: 'MARK_PAID_ALL', performedBy: req.user.name, periodMonth: targetMonth, periodYear: targetYear, entitiesCount: records.length, details: `Marked ${records.length} payroll records as PAID.` });
    res.json({ success: true, message: `${records.length} payroll records ditandai PAID.`, modified: records.length });
  } catch (error) { res.status(500).json({ success: false, message: 'Gagal mark all as paid.' }); }
});

// Mark Unpaid Single
router.put('/:id/mark-unpaid', authMiddleware, requireRole('admin', 'hrd'), async (req, res) => {
  try {
    const record = await Payroll.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record tidak ditemukan.' });
    await record.update({ status: 'Draft', updatedAt: new Date() });
    await User.update({ payrollStatus: 'Unpaid' }, { where: { id: record.employeeId } });
    await PayrollLog.create({ action: 'MARK_UNPAID_SINGLE', performedBy: req.user.name, periodMonth: record.periodMonth, periodYear: record.periodYear, details: `Marked payroll for ${record.name} as UNPAID.` });
    const obj = record.toJSON(); obj.period = { month: obj.periodMonth, year: obj.periodYear };
    res.json({ success: true, message: `Payroll ${record.name} ditandai UNPAID.`, record: obj });
  } catch (error) { res.status(500).json({ success: false, message: 'Gagal mark as unpaid.' }); }
});

// Mark ALL Unpaid
router.put('/mark-all-unpaid', authMiddleware, requireRole('admin', 'hrd'), async (req, res) => {
  try {
    const { month, year, ids } = req.body;
    const targetMonth = month !== undefined ? parseInt(month) : new Date().getMonth();
    const targetYear = year !== undefined ? parseInt(year) : new Date().getFullYear();
    const where = { periodMonth: targetMonth, periodYear: targetYear, status: { [Op.in]: ['Paid', 'Finalized'] } };
    if (ids && ids.length > 0) where.id = { [Op.in]: ids };
    const records = await Payroll.findAll({ where, attributes: ['employeeId'] });
    const employeeIds = records.map(r => r.employeeId);
    await Payroll.update({ status: 'Draft', updatedAt: new Date() }, { where });
    if (employeeIds.length > 0) await User.update({ payrollStatus: 'Unpaid' }, { where: { id: { [Op.in]: employeeIds } } });
    await PayrollLog.create({ action: 'MARK_UNPAID_ALL', performedBy: req.user.name, periodMonth: targetMonth, periodYear: targetYear, entitiesCount: records.length, details: `Marked ${records.length} payroll records as UNPAID.` });
    res.json({ success: true, message: `${records.length} payroll records ditandai UNPAID (Draft).`, modified: records.length });
  } catch (error) { res.status(500).json({ success: false, message: 'Gagal mark all as unpaid.' }); }
});

// Download PDF Payslip
router.get('/:id/pdf', authMiddleware, async (req, res) => {
  try {
    const record = await Payroll.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record tidak ditemukan.' });
    const isPrivileged = ['admin', 'hrd', 'manager'].includes(req.user.role);
    if (!isPrivileged && record.email.toLowerCase() !== req.user.email.toLowerCase()) return res.status(403).json({ success: false, message: 'Akses ditolak.' });

    // Map to old format for PDF generator
    const obj = record.toJSON();
    obj.period = { month: obj.periodMonth, year: obj.periodYear };
    obj.attendanceSummary = { daysPresent: obj.daysPresent, daysLate: obj.daysLateAtt, overtimeHours: obj.overtimeHoursAtt, totalWorkHours: obj.totalWorkHours };

    const pdfBuffer = await generatePayslipPDF(obj);
    const filename = `Payslip_${record.name.replace(/\s+/g, '_')}_${getMonthName(record.periodMonth)}_${record.periodYear}.pdf`;
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': pdfBuffer.length });
    res.send(pdfBuffer);
  } catch (error) { console.error('PDF generate error:', error.message); res.status(500).json({ success: false, message: 'Gagal generate PDF.' }); }
});

// Send Email Blast
router.post('/send-emails', authMiddleware, requireRole('admin', 'hrd'), async (req, res) => {
  try {
    const { month, year, ids } = req.body;
    const targetMonth = month !== undefined ? parseInt(month) : new Date().getMonth();
    const targetYear = year !== undefined ? parseInt(year) : new Date().getFullYear();
    const where = { periodMonth: targetMonth, periodYear: targetYear, status: { [Op.in]: ['Finalized', 'Paid'] } };
    if (ids && ids.length > 0) where.id = { [Op.in]: ids };
    const records = await Payroll.findAll({ where });
    if (records.length === 0) return res.status(400).json({ success: false, message: 'Tidak ada payroll yang siap dikirim.' });

    // Map records for email service
    const mappedRecords = records.map(r => { const obj = r.toJSON(); obj.period = { month: obj.periodMonth, year: obj.periodYear }; return obj; });
    const result = await sendBulkPayslips(mappedRecords, generatePayslipPDF);
    await PayrollLog.create({ action: 'SEND_EMAILS', performedBy: req.user.name, periodMonth: targetMonth, periodYear: targetYear, entitiesCount: result.sent, details: `Sent ${result.sent} emails. Failed: ${result.failed}.` });
    res.json({ success: true, message: `Email blast selesai: ${result.sent} terkirim, ${result.failed} gagal, ${result.skipped} dilewati.`, data: result });
  } catch (error) { console.error('Email blast error:', error.message); res.status(500).json({ success: false, message: 'Gagal mengirim email blast.' }); }
});

// Export Bank Transfer
router.get('/export-bank', authMiddleware, requireRole('admin', 'hrd'), async (req, res) => {
  try {
    const { month, year, format, ids } = req.query;
    const targetMonth = month !== undefined ? parseInt(month) : new Date().getMonth();
    const targetYear = year !== undefined ? parseInt(year) : new Date().getFullYear();
    let idArray = [];
    if (ids) idArray = ids.split(',').filter(id => id.trim().length > 0);
    const result = await generateBankTransferCSV(targetMonth, targetYear, format || 'bca', idArray);
    if (!result.content || result.content.split('\n').length <= 2) return res.status(400).json({ success: false, message: 'Tidak ada data payroll yang tersedia untuk diekspor.' });
    await PayrollLog.create({ action: 'EXPORT_BANK', performedBy: req.user.name, periodMonth: targetMonth, periodYear: targetYear, details: `Exported bank file in ${format || 'bca'} format.` });
    const contentType = (format || 'mandiri') === 'mandiri' ? 'text/plain' : 'text/csv';
    res.set({ 'Content-Type': contentType, 'Content-Disposition': `attachment; filename="${result.filename}"` });
    res.send(result.content);
  } catch (error) { console.error('Bank export error:', error.message); res.status(500).json({ success: false, message: 'Gagal export file bank.' }); }
});

// Cron Status
router.get('/cron-status', authMiddleware, requireRole('admin'), async (req, res) => {
  try { res.json({ success: true, data: getCronStatus() }); }
  catch (error) { res.status(500).json({ success: false, message: 'Gagal mengambil status cron.' }); }
});

module.exports = router;
