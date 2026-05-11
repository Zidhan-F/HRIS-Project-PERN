const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, TeamMember } = require('../models');
const { authMiddleware, requireRole, requireCompany, isRootAdmin, getCompanyFilter } = require('../middleware/auth');
const { validateEmployeeInput, validatePayrollInput, validateProfileInput } = require('../helpers/validation');

// Employees List (filtered by company)
router.get('/', authMiddleware, requireCompany, async (req, res) => {
  try {
    const isPrivileged = ['super_admin', 'admin', 'hrd', 'manager'].includes(req.user.role);
    const attributes = isPrivileged
      ? { exclude: ['googleId'] }
      : ['id', 'name', 'email', 'position', 'department', 'profilePicture', 'employeeId', 'role', 'bio', 'phone', 'manager', 'joinDate', 'employmentStatus', 'contractEnd', 'leaveQuota', 'companyId'];

    // Company isolation
    const where = {};
    if (req.user.role !== 'super_admin') {
      where.companyId = req.user.companyId;
    } else if (req.query.companyId) {
      where.companyId = parseInt(req.query.companyId);
    }

    const employees = await User.findAll({
      where,
      attributes,
      order: [['name', 'ASC']],
      include: [{ model: TeamMember, as: 'teamMembers' }],
    });

    const result = employees.map(e => {
      const obj = e.toJSON();
      obj.teamMembers = (obj.teamMembers || []).map(t => ({ name: t.memberName, email: t.memberEmail, position: t.memberPosition }));
      return obj;
    });

    res.status(200).json({ success: true, employees: result });
  } catch (error) {
    console.error('Employees error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar karyawan.' });
  }
});

// Update Employee
router.put('/:id', authMiddleware, requireCompany, requireRole('super_admin', 'admin', 'manager', 'hrd'), async (req, res) => {
  try {
    const { id } = req.params;
    const { position, department, role, employeeId, employmentStatus, manager, teamMembers, leaveQuota, contractEnd } = req.body;
    const validationErrors = validateEmployeeInput(req.body);
    if (validationErrors.length > 0) return res.status(400).json({ success: false, message: validationErrors.join(', ') });

    const oldEmployee = await User.findByPk(id);
    if (!oldEmployee) return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan.' });

    // Company isolation: non-super_admin can only update employees in their company
    if (req.user.role !== 'super_admin' && oldEmployee.companyId !== req.user.companyId) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Karyawan bukan dari perusahaan Anda.' });
    }

    // Root Admin protection
    if (isRootAdmin(oldEmployee) && role && role !== oldEmployee.role) {
      return res.status(403).json({ success: false, message: 'Role Root Admin tidak dapat diubah.' });
    }

    const updateData = { position, department, employeeId, employmentStatus, manager, leaveQuota };
    if (role && ['super_admin', 'admin'].includes(req.user.role)) {
      // Prevent assigning super_admin via this route (only Super Admin panel can do that)
      if (role !== 'super_admin') updateData.role = role;
    }
    if (contractEnd !== undefined) updateData.contractEnd = (contractEnd === '' || contractEnd === null) ? null : new Date(contractEnd);

    await oldEmployee.update(updateData);

    // Handle team members
    if (teamMembers !== undefined) {
      await TeamMember.destroy({ where: { userId: id } });
      if (Array.isArray(teamMembers) && teamMembers.length > 0) {
        await TeamMember.bulkCreate(teamMembers.map(t => ({
          userId: parseInt(id), memberName: t.name, memberEmail: t.email, memberPosition: t.position,
        })));
      }
    }

    // Bidirectional Team Sync
    if (manager !== oldEmployee.manager) {
      if (oldEmployee.manager) {
        const oldMgr = await User.findOne({ where: { name: oldEmployee.manager, ...getCompanyFilter(req) } });
        if (oldMgr) await TeamMember.destroy({ where: { userId: oldMgr.id, memberEmail: oldEmployee.email } });
      }
      if (manager) {
        const newMgr = await User.findOne({ where: { name: manager, ...getCompanyFilter(req) } });
        if (newMgr) {
          const exists = await TeamMember.findOne({ where: { userId: newMgr.id, memberEmail: oldEmployee.email } });
          if (!exists) await TeamMember.create({ userId: newMgr.id, memberName: oldEmployee.name, memberEmail: oldEmployee.email, memberPosition: oldEmployee.position });
        }
      }
    }

    if (teamMembers) {
      const newEmails = (teamMembers || []).map(m => m.email);
      if (newEmails.length > 0) {
        await User.update({ manager: oldEmployee.name }, { where: { email: { [Op.in]: newEmails }, ...getCompanyFilter(req) } });
      }
    }

    const updatedEmployee = await User.findByPk(id, { include: [{ model: TeamMember, as: 'teamMembers' }] });
    const result = updatedEmployee.toJSON();
    result.teamMembers = (result.teamMembers || []).map(t => ({ name: t.memberName, email: t.memberEmail, position: t.memberPosition }));

    res.status(200).json({ success: true, message: 'Data karyawan & tim berhasil disinkronkan!', employee: result });
  } catch (error) {
    console.error('Update employee error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal memperbarui data karyawan.' });
  }
});

// Delete Employee
router.delete('/:id', authMiddleware, requireCompany, requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan.' });

    // Root Admin protection
    if (isRootAdmin(user)) {
      return res.status(403).json({ success: false, message: 'Root Admin tidak dapat dihapus dari sistem!' });
    }

    // Company isolation
    if (req.user.role !== 'super_admin' && user.companyId !== req.user.companyId) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Karyawan bukan dari perusahaan Anda.' });
    }

    // Prevent deleting super_admin (only root admin or themselves)
    if (user.role === 'super_admin' && !isRootAdmin(req.user)) {
      return res.status(403).json({ success: false, message: 'Hanya Root Admin yang dapat menghapus Super Admin.' });
    }

    await User.destroy({ where: { id } });
    res.status(200).json({ success: true, message: 'Karyawan berhasil dihapus!' });
  } catch (error) {
    console.error('Delete employee error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal menghapus karyawan.' });
  }
});

// Update Payroll Info
router.put('/:id/payroll', authMiddleware, requireCompany, requireRole('super_admin', 'admin', 'manager', 'hrd'), async (req, res) => {
  try {
    const { id } = req.params;
    const { baseSalary, allowance, role, bankAccount, bankName, ptkpStatus, mealAllowanceRate, transportAllowanceRate, payrollStatus, leaveQuota, contractEnd, bpjsKesehatanAmount, bpjsTkAmount, pph21Amount } = req.body;
    const validationErrors = validatePayrollInput(req.body);
    if (validationErrors.length > 0) return res.status(400).json({ success: false, message: validationErrors.join(', ') });

    // Company isolation check
    const targetUser = await User.findByPk(id);
    if (!targetUser) return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan.' });
    if (req.user.role !== 'super_admin' && targetUser.companyId !== req.user.companyId) {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Karyawan bukan dari perusahaan Anda.' });
    }

    const updateData = { baseSalary: Number(baseSalary), allowance: Number(allowance) };
    if (role && ['super_admin', 'admin'].includes(req.user.role)) {
      if (role !== 'super_admin') updateData.role = role;
    }
    if (bankAccount !== undefined) updateData.bankAccount = bankAccount;
    if (bankName !== undefined) updateData.bankName = bankName;
    if (ptkpStatus && ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'].includes(ptkpStatus)) updateData.ptkpStatus = ptkpStatus;
    if (mealAllowanceRate !== undefined) updateData.mealAllowanceRate = Number(mealAllowanceRate);
    if (transportAllowanceRate !== undefined) updateData.transportAllowanceRate = Number(transportAllowanceRate);
    if (payrollStatus) updateData.payrollStatus = payrollStatus;
    if (leaveQuota !== undefined) updateData.leaveQuota = Number(leaveQuota);
    if (bpjsKesehatanAmount !== undefined) updateData.bpjsKesehatanAmount = Number(bpjsKesehatanAmount);
    if (bpjsTkAmount !== undefined) updateData.bpjsTkAmount = Number(bpjsTkAmount);
    if (pph21Amount !== undefined) updateData.pph21Amount = Number(pph21Amount);
    if (contractEnd !== undefined) updateData.contractEnd = (contractEnd === '' || contractEnd === null) ? null : new Date(contractEnd);

    const [count] = await User.update(updateData, { where: { id } });
    if (!count) return res.status(404).json({ success: false, message: 'Karyawan tidak ditemukan.' });

    const updatedUser = await User.findByPk(id);
    res.status(200).json({ success: true, message: 'Payroll & Kontrak berhasil diperbarui!', employee: updatedUser });
  } catch (error) {
    console.error('Payroll error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal memperbarui payroll.' });
  }
});

// Update User Profile
router.put('/profile/update', authMiddleware, async (req, res) => {
  try {
    const { name, bio, phone, address, birthday, gender, maritalStatus } = req.body;
    const validationErrors = validateProfileInput(req.body);
    if (validationErrors.length > 0) return res.status(400).json({ success: false, message: validationErrors.join(', ') });

    await User.update({ name, bio, phone, address, birthday, gender, maritalStatus }, { where: { id: req.user.id } });
    const updatedUser = await User.findByPk(req.user.id);
    if (!updatedUser) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });

    res.status(200).json({ success: true, message: 'Profil berhasil diperbarui!', user: updatedUser });
  } catch (error) {
    console.error('Profile error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal memperbarui profil.' });
  }
});

module.exports = router;
