/**
 * Migration Script: MongoDB → PostgreSQL
 * Reads data from MongoDB and inserts into PostgreSQL
 * Run: node scripts/migrate-to-postgres.js
 */
const path = require('path');
const serverDir = path.join(__dirname, '..', 'server');
const mongoose = require(path.join(serverDir, 'node_modules', 'mongoose'));
const { Sequelize, DataTypes } = require(path.join(serverDir, 'node_modules', 'sequelize'));
require(path.join(serverDir, 'node_modules', 'dotenv')).config({ path: path.join(serverDir, '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27018/ems_db';
const PG_URI = process.env.DATABASE_URL || 'postgres://postgres:zidhan24@localhost:5432/ems_db';

async function migrate() {
  console.log('🚀 Starting MongoDB → PostgreSQL migration...\n');

  // 1. Connect to MongoDB
  console.log('📦 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ MongoDB connected\n');

  // 2. Connect to PostgreSQL
  console.log('🐘 Connecting to PostgreSQL...');
  const sequelize = new Sequelize(PG_URI, { dialect: 'postgres', logging: false });
  await sequelize.authenticate();
  console.log('✅ PostgreSQL connected\n');

  // 3. Read all MongoDB collections
  const db = mongoose.connection.db;

  const mongoUsers = await db.collection('users').find({}).toArray();
  const mongoAttendances = await db.collection('attendances').find({}).toArray();
  const mongoRequests = await db.collection('requests').find({}).toArray();
  const mongoPayrolls = await db.collection('payrolls').find({}).toArray();
  const mongoPayrollLogs = await db.collection('payrolllogs').find({}).toArray();
  const mongoSettings = await db.collection('settings').find({}).toArray();
  const mongoPayrollSettings = await db.collection('payrollsettings').find({}).toArray();

  console.log(`📊 MongoDB Data Summary:`);
  console.log(`   Users: ${mongoUsers.length}`);
  console.log(`   Attendances: ${mongoAttendances.length}`);
  console.log(`   Requests: ${mongoRequests.length}`);
  console.log(`   Payrolls: ${mongoPayrolls.length}`);
  console.log(`   PayrollLogs: ${mongoPayrollLogs.length}`);
  console.log(`   Settings: ${mongoSettings.length}`);
  console.log(`   PayrollSettings: ${mongoPayrollSettings.length}\n`);

  // 4. Sync PostgreSQL tables
  console.log('🔄 Syncing PostgreSQL tables...');
  // Import models to register them
  const pgSequelize = require(path.join(serverDir, 'db'));
  require(path.join(serverDir, 'models'));
  await pgSequelize.sync({ force: true }); // Drop and recreate
  console.log('✅ Tables created\n');

  const { User, Attendance, Request, Payroll, PayrollLog, PayrollSettings, Settings, TeamMember } = require(path.join(serverDir, 'models'));

  // 5. Build ObjectId → Integer ID mapping for users
  const userIdMap = {}; // mongoObjectId -> pgIntId

  // 5a. Migrate Users
  console.log('👥 Migrating Users...');
  for (const mu of mongoUsers) {
    try {
      const pgUser = await User.create({
        name: mu.name || 'Unknown',
        email: mu.email,
        googleId: mu.googleId,
        role: mu.role || 'employee',
        position: mu.position || 'Staff',
        profilePicture: mu.profilePicture,
        bio: mu.bio || '-',
        phone: mu.phone || '-',
        address: mu.address || '-',
        birthday: mu.birthday || null,
        gender: mu.gender || '-',
        maritalStatus: mu.maritalStatus || '-',
        employeeId: mu.employeeId || 'EMS-000',
        joinDate: mu.joinDate || new Date(),
        employmentStatus: mu.employmentStatus || 'Probation',
        contractEnd: mu.contractEnd || null,
        department: mu.department || 'General',
        manager: mu.manager || '',
        baseSalary: mu.baseSalary || 5000000,
        allowance: mu.allowance || 0,
        bankAccount: mu.bankAccount || '-',
        bankName: mu.bankName || '-',
        ptkpStatus: mu.ptkpStatus || 'TK/0',
        mealAllowanceRate: mu.mealAllowanceRate || 25000,
        transportAllowanceRate: mu.transportAllowanceRate || 20000,
        bpjsKesehatanAmount: mu.bpjsKesehatanAmount !== undefined ? mu.bpjsKesehatanAmount : 1,
        bpjsTkAmount: mu.bpjsTkAmount !== undefined ? mu.bpjsTkAmount : 1,
        pph21Amount: mu.pph21Amount !== undefined ? mu.pph21Amount : 1,
        payrollStatus: mu.payrollStatus || 'Unpaid',
        leaveQuota: mu.leaveQuota || 0,
        createdAt: mu.createdAt || new Date(),
      });
      userIdMap[mu._id.toString()] = pgUser.id;

      // Migrate team members
      if (mu.teamMembers && mu.teamMembers.length > 0) {
        for (const tm of mu.teamMembers) {
          await TeamMember.create({
            userId: pgUser.id,
            memberName: tm.name || '',
            memberEmail: tm.email || '',
            memberPosition: tm.position || '',
          });
        }
      }
    } catch (err) {
      console.error(`   ❌ User ${mu.email}: ${err.message}`);
    }
  }
  console.log(`   ✅ ${Object.keys(userIdMap).length} users migrated\n`);

  // 5b. Migrate Attendances
  console.log('📋 Migrating Attendances...');
  let attCount = 0;
  for (const ma of mongoAttendances) {
    try {
      const userId = ma.email ? Object.entries(userIdMap).find(([, v]) => {
        const mu = mongoUsers.find(u => u._id.toString() === Object.keys(userIdMap).find(k => userIdMap[k] === v));
        return mu && mu.email.toLowerCase() === ma.email.toLowerCase();
      })?.[1] : null;

      await Attendance.create({
        userId: userId || null,
        email: ma.email || '',
        name: ma.name || '',
        profilePicture: ma.profilePicture || null,
        latitude: ma.latitude || null,
        longitude: ma.longitude || null,
        type: ma.type || 'clock_in',
        timestamp: ma.timestamp || new Date(),
      });
      attCount++;
    } catch (err) {
      console.error(`   ❌ Attendance: ${err.message}`);
    }
  }
  console.log(`   ✅ ${attCount} attendances migrated\n`);

  // 5c. Migrate Requests
  console.log('📝 Migrating Requests...');
  let reqCount = 0;
  for (const mr of mongoRequests) {
    try {
      // Find user ID by email
      const pgUser = await User.findOne({ where: { email: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), mr.email?.toLowerCase()) } });

      await Request.create({
        userId: pgUser ? pgUser.id : null,
        email: mr.email || '',
        name: mr.name || '',
        type: mr.type,
        startDate: mr.startDate || null,
        endDate: mr.endDate || null,
        reason: mr.reason || '',
        amount: mr.amount || null,
        status: mr.status || 'Pending',
        unpaidDays: mr.unpaidDays || 0,
        isUnpaid: mr.isUnpaid || false,
        timestamp: mr.timestamp || new Date(),
      });
      reqCount++;
    } catch (err) {
      console.error(`   ❌ Request: ${err.message}`);
    }
  }
  console.log(`   ✅ ${reqCount} requests migrated\n`);

  // 5d. Migrate Payrolls
  console.log('💰 Migrating Payrolls...');
  let payCount = 0;
  for (const mp of mongoPayrolls) {
    try {
      const pgEmployeeId = mp.employeeId ? userIdMap[mp.employeeId.toString()] : null;
      if (!pgEmployeeId) { console.warn(`   ⚠️ Skipping payroll for unknown employee: ${mp.email}`); continue; }

      await Payroll.create({
        employeeId: pgEmployeeId,
        email: mp.email, name: mp.name, position: mp.position || 'Staff',
        department: mp.department || 'General', employeeCode: mp.employeeCode || 'EMS-000',
        bankAccount: mp.bankAccount || '-', bankName: mp.bankName || '-',
        profilePicture: mp.profilePicture,
        periodMonth: mp.period?.month ?? 0, periodYear: mp.period?.year ?? new Date().getFullYear(),
        baseSalary: mp.baseSalary || 0, overtimePay: mp.overtimePay || 0,
        overtimeHours: mp.overtimeHours || 0, mealAllowance: mp.mealAllowance || 0,
        transportAllowance: mp.transportAllowance || 0, reimbursement: mp.reimbursement || 0,
        otherAllowance: mp.otherAllowance || 0, latePenalty: mp.latePenalty || 0,
        lateDays: mp.lateDays || 0, unpaidLeaveDays: mp.unpaidLeaveDays || 0,
        unpaidLeaveDeduction: mp.unpaidLeaveDeduction || 0,
        bpjsKesehatan: mp.bpjsKesehatan || 0, bpjsKetenagakerjaan: mp.bpjsKetenagakerjaan || 0,
        pph21: mp.pph21 || 0, grossPay: mp.grossPay || 0,
        totalDeductions: mp.totalDeductions || 0, netPay: mp.netPay || 0,
        overtimeRatePerHour: mp.overtimeRatePerHour, mealAllowanceRate: mp.mealAllowanceRate,
        transportAllowanceRate: mp.transportAllowanceRate, latePenaltyPerDay: mp.latePenaltyPerDay,
        bpjsKesehatanRate: mp.bpjsKesehatanRate, bpjsKetenagakerjaanRate: mp.bpjsKetenagakerjaanRate,
        daysPresent: mp.attendanceSummary?.daysPresent || 0,
        daysLateAtt: mp.attendanceSummary?.daysLate || 0,
        overtimeHoursAtt: mp.attendanceSummary?.overtimeHours || 0,
        totalWorkHours: mp.attendanceSummary?.totalWorkHours || 0,
        ptkpStatus: mp.ptkpStatus || 'TK/0', ptkpAmount: mp.ptkpAmount || 54000000,
        taxableIncomeYearly: mp.taxableIncomeYearly || 0,
        status: mp.status || 'Draft', emailSent: mp.emailSent || false,
        emailSentAt: mp.emailSentAt || null,
        calculatedAt: mp.calculatedAt || new Date(), calculatedBy: mp.calculatedBy || 'system',
        createdAt: mp.createdAt || new Date(), updatedAt: mp.updatedAt || new Date(),
      });
      payCount++;
    } catch (err) {
      console.error(`   ❌ Payroll ${mp.email}: ${err.message}`);
    }
  }
  console.log(`   ✅ ${payCount} payrolls migrated\n`);

  // 5e. Migrate PayrollLogs
  console.log('📜 Migrating PayrollLogs...');
  let logCount = 0;
  for (const ml of mongoPayrollLogs) {
    try {
      await PayrollLog.create({
        action: ml.action, performedBy: ml.performedBy,
        periodMonth: ml.period?.month, periodYear: ml.period?.year,
        entitiesCount: ml.entitiesCount || 0, details: ml.details || '',
        timestamp: ml.timestamp || new Date(),
      });
      logCount++;
    } catch (err) { console.error(`   ❌ PayrollLog: ${err.message}`); }
  }
  console.log(`   ✅ ${logCount} payroll logs migrated\n`);

  // 5f. Migrate Settings
  console.log('⚙️ Migrating Settings...');
  for (const ms of mongoSettings) {
    try {
      await Settings.create({ key: ms.key, value: ms.value, updatedAt: ms.updatedAt || new Date() });
    } catch (err) { console.error(`   ❌ Setting ${ms.key}: ${err.message}`); }
  }
  console.log(`   ✅ ${mongoSettings.length} settings migrated\n`);

  // 5g. Migrate PayrollSettings
  console.log('⚙️ Migrating PayrollSettings...');
  for (const mps of mongoPayrollSettings) {
    try {
      await PayrollSettings.create({
        latePenaltyPerDay: mps.latePenaltyPerDay || 50000,
        overtimeRatePerHour: mps.overtimeRatePerHour || 30000,
        workHoursStart: mps.workHoursStart || 9.25,
        overtimeStart: mps.overtimeStart || 18,
        workingDaysPerMonth: mps.workingDaysPerMonth || 22,
        updatedAt: mps.updatedAt || new Date(), updatedBy: mps.updatedBy || null,
      });
    } catch (err) { console.error(`   ❌ PayrollSettings: ${err.message}`); }
  }
  console.log(`   ✅ PayrollSettings migrated\n`);

  // Done
  console.log('═══════════════════════════════════════');
  console.log('✅ MIGRATION COMPLETE!');
  console.log('═══════════════════════════════════════');
  console.log(`Users: ${Object.keys(userIdMap).length}`);
  console.log(`Attendances: ${attCount}`);
  console.log(`Requests: ${reqCount}`);
  console.log(`Payrolls: ${payCount}`);
  console.log(`PayrollLogs: ${logCount}`);

  await mongoose.disconnect();
  await pgSequelize.close();
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
