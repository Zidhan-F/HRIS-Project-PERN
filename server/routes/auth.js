const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, TeamMember } = require('../models');
const { authMiddleware, verifyGoogleToken } = require('../middleware/auth');

// Google Login & Registration
router.post('/auth/google', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Token tidak ditemukan!' });

    const userData = await verifyGoogleToken(token);
    const existingUser = await User.findOne({ where: { email: { [Op.iLike]: userData.email.trim() } } });

    if (!existingUser && process.env.ALLOW_OPEN_REGISTRATION !== 'true') {
      return res.status(403).json({ success: false, message: 'Akun belum terdaftar. Hubungi HRD untuk didaftarkan.' });
    }

    let user;
    if (existingUser) {
      await existingUser.update({ name: userData.name, email: userData.email, googleId: userData.googleId, profilePicture: userData.picture });
      user = existingUser;
    } else {
      user = await User.create({
        name: userData.name, email: userData.email, googleId: userData.googleId, profilePicture: userData.picture,
        phone: '-', address: '-', gender: '-', maritalStatus: '-',
        employeeId: `EMS-${Math.floor(Math.random() * 900) + 100}`,
        joinDate: new Date(), employmentStatus: 'Probation',
        contractEnd: new Date(new Date().setMonth(new Date().getMonth() + 3)),
        department: 'General', manager: '', baseSalary: 5000000, allowance: 0,
        bankAccount: '-', payrollStatus: 'Unpaid', leaveQuota: 0,
      });
    }

    // Get team members
    const teamMembers = await TeamMember.findAll({ where: { userId: user.id } });

    res.status(200).json({
      success: true, message: `Selamat datang, ${user.name}!`,
      user: {
        id: user.id, name: user.name, email: user.email, picture: user.profilePicture,
        role: user.role, position: user.position, bio: user.bio, phone: user.phone,
        address: user.address, birthday: user.birthday, gender: user.gender,
        maritalStatus: user.maritalStatus, employeeId: user.employeeId, joinDate: user.joinDate,
        employmentStatus: user.employmentStatus, contractEnd: user.contractEnd,
        department: user.department, manager: user.manager,
        teamMembers: teamMembers.map(t => ({ name: t.memberName, email: t.memberEmail, position: t.memberPosition })),
        baseSalary: user.baseSalary, allowance: user.allowance, bankAccount: user.bankAccount,
        payrollStatus: user.payrollStatus, leaveQuota: user.leaveQuota,
      },
    });
  } catch (error) {
    console.error('Auth error:', error.message);
    res.status(401).json({ success: false, message: 'Token tidak valid atau sudah kadaluarsa!' });
  }
});

module.exports = router;
