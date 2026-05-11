const { Op } = require('sequelize');
const User = require('../models/User');
const Payroll = require('../models/Payroll');
const PayrollSettings = require('../models/PayrollSettings');
const Attendance = require('../models/Attendance');
const Request = require('../models/Request');

// ============================================================
// KONFIGURASI TARIF
// ============================================================
const RATES = {
  LATE_PENALTY_PER_DAY: 50000,
  OVERTIME_PER_HOUR: 30000,
  MEAL_ALLOWANCE_PER_DAY: 25000,
  TRANSPORT_ALLOWANCE_PER_DAY: 20000,
  BPJS_KESEHATAN_RATE: 0.01,
  BPJS_KETENAGAKERJAAN_RATE: 0.02,
  WORK_HOURS_START: 9.25,
  OVERTIME_START: 17,
  WORKING_DAYS_PER_MONTH: 22,
};

const PTKP_TABLE = {
  'TK/0': 54000000, 'TK/1': 58500000, 'TK/2': 63000000, 'TK/3': 67500000,
  'K/0': 58500000, 'K/1': 63000000, 'K/2': 67500000, 'K/3': 72000000,
};

function calculatePPh21Monthly(grossYearly, ptkpStatus) {
  const ptkp = PTKP_TABLE[ptkpStatus] || PTKP_TABLE['TK/0'];
  const pkp = Math.max(0, grossYearly - ptkp);
  let tax = 0;
  if (pkp <= 60000000) tax = pkp * 0.05;
  else if (pkp <= 250000000) tax = 60000000 * 0.05 + (pkp - 60000000) * 0.15;
  else if (pkp <= 500000000) tax = 60000000 * 0.05 + 190000000 * 0.15 + (pkp - 250000000) * 0.25;
  else if (pkp <= 5000000000) tax = 60000000 * 0.05 + 190000000 * 0.15 + 250000000 * 0.25 + (pkp - 500000000) * 0.30;
  else tax = 60000000 * 0.05 + 190000000 * 0.15 + 250000000 * 0.25 + 4500000000 * 0.30 + (pkp - 5000000000) * 0.35;
  return Math.round(tax / 12);
}

// ============================================================
// ATTENDANCE SUMMARY
// ============================================================
async function getAttendanceSummary(email, month, year, manualOvertimeByDay = {}, preFetchedRecords = null) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  const records = preFetchedRecords || await Attendance.findAll({
    where: { email: { [Op.iLike]: email.trim() }, timestamp: { [Op.between]: [start, end] } },
    order: [['timestamp', 'ASC']],
  });

  const days = {};
  records.forEach(r => {
    const d = new Date(r.timestamp);
    const dateKey = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    if (!days[dateKey]) days[dateKey] = { ins: [], outs: [] };
    if (r.type === 'clock_in') days[dateKey].ins.push(d);
    if (r.type === 'clock_out') days[dateKey].outs.push(d);
  });

  Object.keys(manualOvertimeByDay).forEach(dateKey => {
    if (!days[dateKey]) days[dateKey] = { ins: [], outs: [] };
  });

  let daysPresent = 0, daysLate = 0, overtimeHours = 0, totalWorkHours = 0;
  const dailyOvertimeDetails = {};

  Object.entries(days).forEach(([dateStr, times]) => {
    let dailyAutoOvertime = 0;
    if (times.ins.length > 0) {
      daysPresent++;
      const firstIn = new Date(Math.min(...times.ins.map(d => d.getTime())));
      const jakartaIn = new Date(firstIn.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const inHour = jakartaIn.getHours() + jakartaIn.getMinutes() / 60;
      if (inHour > RATES.WORK_HOURS_START) daysLate++;
      if (times.outs.length > 0) {
        const lastOut = new Date(Math.max(...times.outs.map(d => d.getTime())));
        const jakartaOut = new Date(lastOut.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
        const outHour = jakartaOut.getHours() + jakartaOut.getMinutes() / 60;
        if (outHour > RATES.OVERTIME_START) dailyAutoOvertime = outHour - RATES.OVERTIME_START;
        const workMs = lastOut.getTime() - firstIn.getTime();
        totalWorkHours += workMs / (1000 * 60 * 60);
      }
    }
    const dailyManualOvertime = manualOvertimeByDay[dateStr] || 0;
    const validatedDailyHours = Math.min(dailyAutoOvertime, 1) + dailyManualOvertime;
    overtimeHours += validatedDailyHours;
    if (validatedDailyHours > 0) dailyOvertimeDetails[dateStr] = Math.round(validatedDailyHours * 10) / 10;
  });

  return { daysPresent, daysLate, overtimeHours: Math.round(overtimeHours * 10) / 10, totalWorkHours: Math.round(totalWorkHours * 10) / 10, dailyOvertimeDetails };
}

async function getApprovedOvertimeHoursPerDay(email, start, end, preFetchedRequests = null) {
  const overtimeRequests = preFetchedRequests || await Request.findAll({
    where: { email: { [Op.iLike]: email.trim() }, type: 'Overtime', status: 'Approved', startDate: { [Op.lte]: end }, endDate: { [Op.gte]: start } },
  });
  const dailyRequestHours = {};
  overtimeRequests.forEach(req => {
    if (req.startDate && req.endDate) {
      const hours = Math.max(0, (new Date(req.endDate) - new Date(req.startDate)) / (1000 * 60 * 60));
      const dateKey = new Date(req.startDate).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      dailyRequestHours[dateKey] = (dailyRequestHours[dateKey] || 0) + hours;
    }
  });
  return dailyRequestHours;
}

async function getApprovedReimbursements(email, month, year, preFetchedRequests = null) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  const reimbursements = preFetchedRequests || await Request.findAll({
    where: { email: { [Op.iLike]: email.trim() }, type: 'Reimbursement', status: 'Approved', timestamp: { [Op.between]: [start, end] } },
  });
  return reimbursements.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
}

async function getUnpaidLeaveDays(email, month, year, preFetchedRequests = null) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  const leaves = preFetchedRequests || await Request.findAll({
    where: { email: { [Op.iLike]: email.trim() }, type: { [Op.in]: ['Leave', 'Permit'] }, status: 'Approved', startDate: { [Op.lte]: end }, endDate: { [Op.gte]: start } },
  });
  return leaves.reduce((sum, leave) => sum + (leave.unpaidDays || 0), 0);
}

// ============================================================
// CALCULATE PAYROLL FOR SINGLE EMPLOYEE
// ============================================================
async function calculateEmployeePayroll(userId, month, year, calculatedBy = 'system', preFetchedData = null) {
  const user = (preFetchedData && preFetchedData.user) || await User.findByPk(userId);
  if (!user) throw new Error('User not found');

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);

  const manualOvertimeByDay = await getApprovedOvertimeHoursPerDay(
    user.email, start, end,
    preFetchedData?.requests?.filter(r => r.type === 'Overtime')
  );
  const attendance = await getAttendanceSummary(
    user.email, month, year, manualOvertimeByDay,
    preFetchedData?.attendance
  );
  const reimbursement = await getApprovedReimbursements(
    user.email, month, year,
    preFetchedData?.requests?.filter(r => r.type === 'Reimbursement')
  );
  const unpaidLeaveDays = await getUnpaidLeaveDays(
    user.email, month, year,
    preFetchedData?.requests?.filter(r => ['Leave', 'Permit'].includes(r.type))
  );

  let settings = { ...RATES };
  if (preFetchedData && preFetchedData.payrollSettings) {
    const pS = preFetchedData.payrollSettings;
    if (pS.latePenaltyPerDay !== undefined) settings.LATE_PENALTY_PER_DAY = Number(pS.latePenaltyPerDay);
    if (pS.overtimeRatePerHour !== undefined) settings.OVERTIME_PER_HOUR = Number(pS.overtimeRatePerHour);
  } else {
    try {
      const pS = await PayrollSettings.findOne();
      if (pS) {
        if (pS.latePenaltyPerDay !== undefined) settings.LATE_PENALTY_PER_DAY = Number(pS.latePenaltyPerDay);
        if (pS.overtimeRatePerHour !== undefined) settings.OVERTIME_PER_HOUR = Number(pS.overtimeRatePerHour);
      }
    } catch (err) { console.error('Failed to fetch PayrollSettings:', err.message); }
  }

  const baseSalary = Number(user.baseSalary) || 5000000;
  const otherAllowance = Number(user.allowance) || 0;
  let overtimePay = 0;
  const overtimeRateBase = settings.OVERTIME_PER_HOUR;

  if (user.role === 'employee') {
    Object.values(attendance.dailyOvertimeDetails || {}).forEach(hours => {
      if (hours > 0) {
        overtimePay += Math.min(hours, 1) * 1.5 * overtimeRateBase;
        if (hours > 1) overtimePay += (hours - 1) * 2.0 * overtimeRateBase;
      }
    });
  }

  const mealRate = Number(user.mealAllowanceRate) ?? settings.MEAL_ALLOWANCE_PER_DAY;
  const transportRate = Number(user.transportAllowanceRate) ?? settings.TRANSPORT_ALLOWANCE_PER_DAY;
  const mealAllowance = attendance.daysPresent * mealRate;
  const transportAllowance = attendance.daysPresent * transportRate;
  const grossPay = baseSalary + otherAllowance + overtimePay + mealAllowance + transportAllowance + reimbursement;
  const taxableGross = grossPay - reimbursement;
  const latePenalty = attendance.daysLate * settings.LATE_PENALTY_PER_DAY;
  const unpaidLeaveDeduction = Math.round((baseSalary / 22) * unpaidLeaveDays);

  const bpjsKesehatanAmt = Number(user.bpjsKesehatanAmount);
  const bpjsKesehatan = bpjsKesehatanAmt === 0 ? 0 : (bpjsKesehatanAmt > 1 ? bpjsKesehatanAmt : Math.round(baseSalary * RATES.BPJS_KESEHATAN_RATE));
  const bpjsTkAmt = Number(user.bpjsTkAmount);
  const bpjsKetenagakerjaan = bpjsTkAmt === 0 ? 0 : (bpjsTkAmt > 1 ? bpjsTkAmt : Math.round(baseSalary * RATES.BPJS_KETENAGAKERJAAN_RATE));

  const ptkpStatus = user.ptkpStatus || 'TK/0';
  const taxableYearly = taxableGross * 12;
  const pph21Amt = Number(user.pph21Amount);
  const pph21 = pph21Amt === 0 ? 0 : (pph21Amt > 1 ? pph21Amt : calculatePPh21Monthly(taxableYearly, ptkpStatus));

  const totalDeductions = latePenalty + unpaidLeaveDeduction + bpjsKesehatan + bpjsKetenagakerjaan + pph21;
  const netPay = Math.max(0, grossPay - totalDeductions);

  const payrollData = {
    employeeId: user.id, email: user.email, name: user.name,
    position: user.position || 'Staff', department: user.department || 'General',
    employeeCode: user.employeeId || 'EMS-000', profilePicture: user.profilePicture,
    bankAccount: user.bankAccount || '-', bankName: user.bankName || '-',
    periodMonth: month, periodYear: year,
    baseSalary, overtimePay: Math.round(overtimePay),
    overtimeHours: Math.round(attendance.overtimeHours * 10) / 10,
    mealAllowance, transportAllowance, reimbursement, otherAllowance,
    latePenalty, lateDays: attendance.daysLate, unpaidLeaveDays, unpaidLeaveDeduction,
    bpjsKesehatan, bpjsKetenagakerjaan, pph21, grossPay, totalDeductions, netPay,
    overtimeRatePerHour: settings.OVERTIME_PER_HOUR, mealAllowanceRate: mealRate,
    transportAllowanceRate: transportRate, latePenaltyPerDay: settings.LATE_PENALTY_PER_DAY,
    bpjsKesehatanRate: RATES.BPJS_KESEHATAN_RATE, bpjsKetenagakerjaanRate: RATES.BPJS_KETENAGAKERJAAN_RATE,
    daysPresent: attendance.daysPresent, daysLateAtt: attendance.daysLate,
    overtimeHoursAtt: attendance.overtimeHours, totalWorkHours: attendance.totalWorkHours,
    ptkpStatus, ptkpAmount: PTKP_TABLE[ptkpStatus] || PTKP_TABLE['TK/0'],
    taxableIncomeYearly: Math.max(0, taxableYearly - (PTKP_TABLE[ptkpStatus] || PTKP_TABLE['TK/0'])),
    calculatedAt: new Date(), calculatedBy, updatedAt: new Date(),
  };

  // Upsert: find existing or create
  const existing = await Payroll.findOne({ where: { employeeId: user.id, periodMonth: month, periodYear: year } });
  let payroll;
  if (existing) {
    await existing.update(payrollData);
    payroll = existing;
    if (payroll.status === 'Finalized') { payroll.status = 'Draft'; await payroll.save(); }
  } else {
    payroll = await Payroll.create({ ...payrollData, status: 'Draft', emailSent: false });
  }
  return payroll;
}

// ============================================================
// CALCULATE ALL (Bulk Optimized)
// ============================================================
async function calculateAllPayroll(month, year, calculatedBy = 'system-cron', ids = []) {
  const where = {};
  if (ids && ids.length > 0) where.id = { [Op.in]: ids };
  const users = await User.findAll({ where, order: [['name', 'ASC']] });

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  console.log(`🚀 [PAYROLL] Starting bulk calculation for ${users.length} users...`);

  const [allAttendance, allRequests, payrollSettings] = await Promise.all([
    Attendance.findAll({ where: { timestamp: { [Op.between]: [start, end] } } }),
    Request.findAll({ where: { status: 'Approved', [Op.or]: [{ timestamp: { [Op.between]: [start, end] } }, { startDate: { [Op.lte]: end }, endDate: { [Op.gte]: start } }] } }),
    PayrollSettings.findOne(),
  ]);

  const attendanceMap = {}, requestMap = {};
  allAttendance.forEach(a => { const e = a.email.toLowerCase(); if (!attendanceMap[e]) attendanceMap[e] = []; attendanceMap[e].push(a); });
  allRequests.forEach(r => { const e = r.email.toLowerCase(); if (!requestMap[e]) requestMap[e] = []; requestMap[e].push(r); });

  const results = [], errors = [];
  for (const user of users) {
    try {
      const email = user.email.toLowerCase();
      const payroll = await calculateEmployeePayroll(user.id, month, year, calculatedBy, { user, attendance: attendanceMap[email] || [], requests: requestMap[email] || [], payrollSettings });
      results.push(payroll);
    } catch (err) { errors.push({ email: user.email, error: err.message }); console.error(`❌ Payroll error for ${user.email}:`, err.message); }
  }
  console.log(`✅ Payroll calculated: ${results.length} success, ${errors.length} errors`);
  return { results, errors, total: users.length };
}

// ============================================================
// BANK TRANSFER CSV
// ============================================================
async function generateBankTransferCSV(month, year, format = 'bca', ids = []) {
  const where = { periodMonth: month, periodYear: year };
  if (ids && ids.length > 0) where.id = { [Op.in]: ids };
  else where.status = { [Op.in]: ['Finalized', 'Paid'] };
  const records = await Payroll.findAll({ where, order: [['name', 'ASC']] });

  const esc = (val) => { if (val === null || val === undefined) return ''; const str = String(val); if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('|')) return `"${str.replace(/"/g, '""')}"`; return str; };

  if (format === 'mandiri') {
    let csv = 'No Rekening|Nama Penerima|Jumlah Transfer|Keterangan\n';
    records.forEach(r => { csv += `${esc(r.bankAccount !== '-' ? r.bankAccount : '')}|${esc(r.name)}|${r.netPay}|Gaji ${getMonthName(month)} ${year}\n`; });
    return { content: csv, filename: `transfer_mandiri_${getMonthName(month)}_${year}.txt` };
  }

  let csv = 'No Rekening,Nama Penerima,Jumlah Transfer,Email,Keterangan\n';
  records.forEach(r => { csv += `${esc(r.bankAccount !== '-' ? r.bankAccount : '')},${esc(r.name)},${r.netPay},${esc(r.email)},Gaji ${getMonthName(month)} ${year}\n`; });
  return { content: csv, filename: `transfer_bca_${getMonthName(month)}_${year}.csv` };
}

function getMonthName(month) {
  return ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'][month] || 'Unknown';
}

module.exports = { calculateEmployeePayroll, calculateAllPayroll, generateBankTransferCSV, RATES, PTKP_TABLE, getMonthName };
