const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, Company, TeamMember } = require('../models');
const { authMiddleware, verifyGoogleToken } = require('../middleware/auth');

// TEMPORARY CLEANUP ROUTE (Delete after use)
router.get('/temp-cleanup', async (req, res) => {
  try {
    await User.update({ companyId: null }, { where: { role: 'super_admin' } });
    await Company.destroy({ where: { name: 'OUR Company' } });
    res.send('Cleanup Success: Super Admins are now independent and "OUR Company" is deleted.');
  } catch (err) {
    res.status(500).send('Cleanup Failed: ' + err.message);
  }
});

// Google Login (Invite-Only)
router.post('/auth/google', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token tidak ditemukan!' });

    const userData = await verifyGoogleToken(token);
    const existingUser = await User.findOne({
      where: { email: { [Op.iLike]: userData.email.trim() } },
      include: [{ model: Company, as: 'company', attributes: ['id', 'name', 'code', 'status'] }],
    });

    // INVITE-ONLY: Reject unregistered users
    if (!existingUser) {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda belum terdaftar di sistem. Hubungi Admin perusahaan Anda untuk didaftarkan.',
      });
    }

    // Check if company is active (for non-super_admin)
    if (existingUser.role !== 'super_admin' && existingUser.company && existingUser.company.status === 'inactive') {
      return res.status(403).json({ success: false, message: 'Perusahaan Anda sedang nonaktif. Hubungi Super Admin.' });
    }

    // Update Google identity on login (links Google account to pre-registered user)
    await existingUser.update({
      name: userData.name,
      googleId: userData.googleId,
      profilePicture: userData.picture,
    });

    // Get team members
    const teamMembers = await TeamMember.findAll({ where: { userId: existingUser.id } });

    const isSuperAdmin = existingUser.role === 'super_admin';
    const companyData = (existingUser.company && !isSuperAdmin) ? {
      companyId: existingUser.company.id,
      companyName: existingUser.company.name,
      companyCode: existingUser.company.code,
    } : { companyId: null, companyName: 'Console', companyCode: 'SYSTEM' };

    res.status(200).json({
      success: true,
      message: `Selamat datang, ${existingUser.name}!`,
      user: {
        id: existingUser.id, name: existingUser.name, email: existingUser.email,
        picture: existingUser.profilePicture, role: existingUser.role,
        position: existingUser.position, bio: existingUser.bio,
        phone: existingUser.phone, address: existingUser.address,
        birthday: existingUser.birthday, gender: existingUser.gender,
        maritalStatus: existingUser.maritalStatus, employeeId: existingUser.employeeId,
        joinDate: existingUser.joinDate, employmentStatus: existingUser.employmentStatus,
        contractEnd: existingUser.contractEnd, department: existingUser.department,
        manager: existingUser.manager,
        teamMembers: teamMembers.map(t => ({ name: t.memberName, email: t.memberEmail, position: t.memberPosition })),
        baseSalary: existingUser.baseSalary, allowance: existingUser.allowance,
        bankAccount: existingUser.bankAccount, payrollStatus: existingUser.payrollStatus,
        leaveQuota: existingUser.leaveQuota,
        ...companyData,
      },
    });
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(401).json({ success: false, message: 'Token tidak valid atau sudah kadaluarsa!' });
  }
});

module.exports = router;
