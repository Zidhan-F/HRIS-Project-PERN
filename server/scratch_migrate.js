const { User, Company, Attendance, Payroll, Request } = require('./models');
const sequelize = require('./db');

async function migrateData() {
  try {
    console.log('🚀 Starting robust data migration...');
    
    // 0. Manually add columns using Raw SQL (Safer than sync alter)
    console.log('⏳ Ensuring columns exist...');
    const tables = ['users', 'attendances', 'payrolls', 'requests'];
    for (const table of tables) {
      try {
        await sequelize.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS company_id INTEGER;`);
        console.log(`✅ Column company_id ensured in table ${table}`);
      } catch (e) {
        console.log(`⚠️ Note on table ${table}: ${e.message}`);
      }
    }

    // 1. Create default company
    const [defaultCompany] = await Company.findOrCreate({
      where: { code: 'DEFAULT' },
      defaults: {
        name: 'EMS Main Company',
        code: 'DEFAULT',
        address: 'Main Office',
        status: 'active'
      }
    });
    
    console.log(`✅ Default company ready: ${defaultCompany.name} (ID: ${defaultCompany.id})`);

    // 2. Update Data
    console.log('⏳ Assigning existing records to default company...');
    
    const userResult = await User.update({ companyId: defaultCompany.id }, { where: { companyId: null } });
    console.log(`✅ Updated ${userResult[0]} users.`);

    const attResult = await Attendance.update({ companyId: defaultCompany.id }, { where: { companyId: null } });
    console.log(`✅ Updated ${attResult[0]} attendance records.`);

    const payrollResult = await Payroll.update({ companyId: defaultCompany.id }, { where: { companyId: null } });
    console.log(`✅ Updated ${payrollResult[0]} payroll records.`);

    const reqResult = await Request.update({ companyId: defaultCompany.id }, { where: { companyId: null } });
    console.log(`✅ Updated ${reqResult[0]} request records.`);

    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrateData();
