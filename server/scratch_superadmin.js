const { User, Company } = require('./models');
const sequelize = require('./db');

async function createSuperAdmin() {
  const email = 'zidanmuhammad759@gmail.com';
  const name = 'Zidhan Muhammad'; // Nama dari akun Gmail Anda
  
  try {
    console.log(`🚀 Setting up Super Admin for: ${email}`);
    
    // 1. Ensure Default Company exists for the first assignment
    const [defaultCompany] = await Company.findOrCreate({
      where: { code: 'DEFAULT' },
      defaults: {
        name: 'EMS Main Company',
        code: 'DEFAULT',
        status: 'active'
      }
    });

    // 2. Find or Create the User
    const [user, created] = await User.findOrCreate({
      where: { email: email },
      defaults: {
        name: name,
        email: email,
        role: 'super_admin',
        companyId: defaultCompany.id,
        position: 'System Owner'
      }
    });

    if (!created) {
      // If user already exists, upgrade to super_admin
      await user.update({ role: 'super_admin' });
      console.log('✅ Existing user upgraded to Super Admin.');
    } else {
      console.log('✅ New Super Admin account created.');
    }

    console.log('🎉 You can now login using this Google account.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to set Super Admin:', error.message);
    process.exit(1);
  }
}

createSuperAdmin();
