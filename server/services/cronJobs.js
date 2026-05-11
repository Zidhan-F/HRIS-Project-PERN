const cron = require('node-cron');
const { Op } = require('sequelize');
const { User, Company, Attendance, Payroll, PayrollSettings } = require('../models');
const { calculateAllPayroll } = require('./payrollEngine');
const { generatePayslipPDF } = require('./pdfGenerator');
const { sendBulkPayslips, sendBulkAttendanceReminders } = require('./emailService');

let cronStatus = {
  payrollCalc: { lastRun: null, nextRun: null, status: 'idle' },
  emailBlast: { lastRun: null, nextRun: null, status: 'idle' },
  isEnabled: false,
};

function initCronJobs() {
  const enableCron = process.env.ENABLE_CRON === 'true' || process.env.NODE_ENV === 'production';
  if (!enableCron) { console.log('⏸️  Cron Jobs DISABLED'); cronStatus.isEnabled = false; return; }

  cronStatus.isEnabled = true;
  console.log('🕐 Cron Jobs ENABLED (Dynamic Payday)');

  // JOB 1: Auto Calculate Payroll (Run EVERY DAY at 00:05)
  // Checks which companies have their 'payday' today.
  cron.schedule('5 0 * * *', async () => {
    const today = new Date().getDate();
    console.log(`🤖 [CRON] Checking for companies with payday ${today}...`);
    
    cronStatus.payrollCalc.status = 'running';
    cronStatus.payrollCalc.lastRun = new Date();

    try {
      // Find companies whose settings match today's date
      const settings = await PayrollSettings.findAll({ 
        where: { payday: today },
        include: [{ model: Company, as: 'company', where: { status: 'active' } }]
      });

      if (settings.length === 0) {
        console.log('  ℹ️ No companies have payday today.');
        cronStatus.payrollCalc.status = 'idle';
        return;
      }

      const now = new Date();
      for (const s of settings) {
        if (!s.companyId) continue;
        console.log(`  📊 Calculating payroll for ${s.company.name} (Payday: ${s.payday})...`);
        await calculateAllPayroll(now.getMonth(), now.getFullYear(), 'system-cron', [], s.companyId);
      }
      
      cronStatus.payrollCalc.status = 'completed';
      console.log(`✅ [CRON] Daily check completed. Processed ${settings.length} companies.`);
    } catch (err) { 
      cronStatus.payrollCalc.status = 'error'; 
      console.error('❌ [CRON] Payroll calculation failed:', err.message); 
    }
  }, { timezone: 'Asia/Jakarta' });

  // JOB 2: Auto Send Email Payslips (Run EVERY DAY at 09:00)
  // Sends emails for companies that hit their payday today.
  cron.schedule('0 9 * * *', async () => {
    const today = new Date().getDate();
    console.log(`📧 [CRON] Checking for email blasts (Payday: ${today})...`);
    
    cronStatus.emailBlast.status = 'running';
    cronStatus.emailBlast.lastRun = new Date();

    try {
      const settings = await PayrollSettings.findAll({ 
        where: { payday: today },
        include: [{ model: Company, as: 'company', where: { status: 'active' } }]
      });

      let totalEmails = 0;
      const now = new Date();

      for (const s of settings) {
        if (!s.companyId) continue;
        const records = await Payroll.findAll({
          where: { 
            periodMonth: now.getMonth(), 
            periodYear: now.getFullYear(), 
            companyId: s.companyId, 
            status: { [Op.in]: ['Finalized', 'Paid'] }, 
            emailSent: false 
          },
        });

        if (records.length > 0) {
          console.log(`  📡 Sending ${records.length} emails for ${s.company.name}...`);
          const mapped = records.map(r => { 
            const obj = r.toJSON(); 
            obj.period = { month: obj.periodMonth, year: obj.periodYear }; 
            return obj; 
          });
          await sendBulkPayslips(mapped, generatePayslipPDF);
          totalEmails += records.length;
        }
      }
      
      cronStatus.emailBlast.status = 'completed';
      console.log(`✅ [CRON] Email blast completed: ${totalEmails} emails.`);
    } catch (err) { 
      cronStatus.emailBlast.status = 'error'; 
      console.error('❌ [CRON] Email blast failed:', err.message); 
    }
  }, { timezone: 'Asia/Jakarta' });

  // JOB 3: Daily Attendance Reminder (Mon-Fri, 08:30 WIB)
  cron.schedule('30 8 * * 1-5', async () => {
    console.log('🔔 [CRON] Running daily attendance reminders...');
    try {
      const jakartaDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      const start = new Date(`${jakartaDateStr}T00:00:00.000+07:00`);
      const end = new Date(`${jakartaDateStr}T23:59:59.999+07:00`);

      const companies = await Company.findAll({ where: { status: 'active' } });
      for (const company of companies) {
        const allUsers = await User.findAll({ where: { role: 'employee', companyId: company.id } });
        const todayAttendances = await Attendance.findAll({ where: { timestamp: { [Op.between]: [start, end] }, type: 'clock_in', companyId: company.id } });
        const presentEmails = todayAttendances.map(a => a.email);
        const missingUsers = allUsers.filter(u => !presentEmails.includes(u.email));
        
        if (missingUsers.length > 0) {
          await sendBulkAttendanceReminders(missingUsers);
        }
      }
    } catch (err) { console.error('❌ [CRON] Attendance reminder check failed:', err.message); }
  }, { timezone: 'Asia/Jakarta' });

  console.log('✅ Dynamic Cron Jobs registered (Checks payday daily)');
}

function getCronStatus() { return cronStatus; }

module.exports = { initCronJobs, getCronStatus };
