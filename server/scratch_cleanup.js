const { User, Company } = require('./models');

async function cleanSuperAdmin() {
  try {
    console.log('--- Cleaning Super Admin Data ---');
    
    // 1. Set companyId to NULL for all super_admins
    const [updatedCount] = await User.update(
      { companyId: null },
      { where: { role: 'super_admin' } }
    );
    
    console.log(`✅ Success: ${updatedCount} super_admin(s) are now independent (companyId = null).`);

    // 2. Look for "OUR Company" or company with ID 1 to delete if it's the placeholder
    // We search by name or common placeholder patterns
    const defaultCompany = await Company.findOne({
      where: { 
        name: 'OUR Company' 
      }
    });

    if (defaultCompany) {
      const name = defaultCompany.name;
      await defaultCompany.destroy();
      console.log(`✅ Success: Default company "${name}" has been deleted.`);
    } else {
      console.log('ℹ️ Note: No company named "OUR Company" found. Skipping deletion.');
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error cleaning data:', err);
    process.exit(1);
  }
}

cleanSuperAdmin();
