const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Company, User, Attendance, Request, Payroll, PayrollSettings, Settings } = require('../models');
const { authMiddleware, requireRole, requireSuperAdmin, isRootAdmin, requireCompany } = require('../middleware/auth');

// ============================================================
// COMPANY MANAGEMENT (Super Admin Only)
// ============================================================

// GET all companies
router.get('/', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const companies = await Company.findAll({
      order: [['name', 'ASC']],
      include: [{ model: User, as: 'users', attributes: ['id'] }],
    });
    const result = companies.map(c => {
      const obj = c.toJSON();
      obj.employeeCount = (obj.users || []).length;
      delete obj.users;
      return obj;
    });
    res.json({ success: true, companies: result });
  } catch (error) {
    console.error('Get companies error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar perusahaan.' });
  }
});

// GET single company detail
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // Super admin can see any, company admin can see their own
    if (req.user.role !== 'super_admin' && req.user.companyId !== parseInt(id)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }
    const company = await Company.findByPk(id, {
      include: [{ model: User, as: 'users', attributes: ['id', 'name', 'email', 'role', 'position', 'department', 'profilePicture', 'employmentStatus'] }],
    });
    if (!company) return res.status(404).json({ success: false, message: 'Perusahaan tidak ditemukan.' });
    res.json({ success: true, company });
  } catch (error) {
    console.error('Get company error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil data perusahaan.' });
  }
});

// CREATE company
router.post('/', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const { name, code, address, logo, phone, email } = req.body;
    if (!name || !code) return res.status(400).json({ success: false, message: 'Nama dan kode perusahaan wajib diisi.' });

    // Check unique code
    const existing = await Company.findOne({ where: { code: code.toUpperCase() } });
    if (existing) return res.status(400).json({ success: false, message: `Kode "${code}" sudah digunakan oleh perusahaan lain.` });

    const company = await Company.create({
      name, code: code.toUpperCase(), address: address || '-', logo, phone: phone || '-', email,
    });

    // Auto-create default PayrollSettings for this company
    await PayrollSettings.create({ companyId: company.id });

    res.status(201).json({ success: true, message: `Perusahaan "${name}" berhasil didaftarkan!`, company });
  } catch (error) {
    console.error('Create company error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal membuat perusahaan.' });
  }
});

// UPDATE company
router.put('/:id', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, address, logo, phone, email, status } = req.body;
    const company = await Company.findByPk(id);
    if (!company) return res.status(404).json({ success: false, message: 'Perusahaan tidak ditemukan.' });

    if (code && code.toUpperCase() !== company.code) {
      const existing = await Company.findOne({ where: { code: code.toUpperCase(), id: { [Op.ne]: id } } });
      if (existing) return res.status(400).json({ success: false, message: `Kode "${code}" sudah digunakan.` });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code.toUpperCase();
    if (address !== undefined) updateData.address = address;
    if (logo !== undefined) updateData.logo = logo;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (status !== undefined && ['active', 'inactive'].includes(status)) updateData.status = status;

    await company.update(updateData);
    res.json({ success: true, message: 'Perusahaan berhasil diperbarui!', company });
  } catch (error) {
    console.error('Update company error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal memperbarui perusahaan.' });
  }
});

// DELETE company
router.delete('/:id', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const company = await Company.findByPk(id);
    if (!company) return res.status(404).json({ success: false, message: 'Perusahaan tidak ditemukan.' });

    const userCount = await User.count({ where: { companyId: id } });

    // If company is ACTIVE and has users -> Soft Delete (set to inactive)
    if (company.status === 'active' && userCount > 0) {
      await company.update({ status: 'inactive' });
      return res.json({ 
        success: true, 
        message: `Perusahaan "${company.name}" telah dinonaktifkan. Klik hapus sekali lagi jika ingin menghapus secara permanen.` 
      });
    }

    // If company is already INACTIVE or has NO users -> Hard Delete
    await company.destroy();
    res.json({ success: true, message: `Perusahaan "${company.name}" telah dihapus secara permanen dari sistem.` });
  } catch (error) {
    console.error('Delete company error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal menghapus perusahaan. Pastikan tidak ada data yang masih terikat.' });
  }
});

// ============================================================
// EMPLOYEE INVITATION (Super Admin + Company Admin)
// ============================================================

// GET employees of a company
router.get('/:id/employees', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    // Super admin can see any, company admin can see their own
    if (req.user.role !== 'super_admin' && req.user.companyId !== parseInt(id)) {
      return res.status(403).json({ success: false, message: 'Akses ditolak.' });
    }
    const employees = await User.findAll({
      where: { companyId: id },
      attributes: { exclude: ['googleId'] },
      order: [['name', 'ASC']],
    });
    res.json({ success: true, employees });
  } catch (error) {
    console.error('Get company employees error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar karyawan.' });
  }
});

// INVITE employee to a company
router.post('/:id/invite', authMiddleware, async (req, res) => {
  try {
    const companyId = parseInt(req.params.id);
    const { email, name, role, position, department } = req.body;

    // Permission check: super_admin can invite to any company, admin can invite to their own
    if (req.user.role === 'super_admin') {
      // OK - can invite to any company
    } else if (req.user.role === 'admin' && req.user.companyId === companyId) {
      // Company admin can invite to their own company
    } else {
      return res.status(403).json({ success: false, message: 'Akses ditolak. Hanya Super Admin atau Admin perusahaan ini yang dapat meng-invite.' });
    }

    // Validate input
    if (!email || !name) {
      return res.status(400).json({ success: false, message: 'Email dan nama karyawan wajib diisi.' });
    }

    // Validate role
    const allowedRoles = ['employee', 'hrd', 'manager', 'admin'];
    const targetRole = role || 'employee';
    if (!allowedRoles.includes(targetRole)) {
      return res.status(400).json({ success: false, message: 'Role tidak valid.' });
    }

    // Only super_admin can assign admin role
    if (targetRole === 'admin' && req.user.role !== 'super_admin') {
      // Company admin CAN assign admin role to others in their company
      // This is allowed per user request
    }

    // Prevent assigning super_admin role via invite
    if (targetRole === 'super_admin') {
      return res.status(400).json({ success: false, message: 'Role super_admin tidak dapat di-assign melalui invite.' });
    }

    // Check if company exists
    const company = await Company.findByPk(companyId);
    if (!company) return res.status(404).json({ success: false, message: 'Perusahaan tidak ditemukan.' });
    if (company.status === 'inactive') return res.status(400).json({ success: false, message: 'Perusahaan sedang nonaktif.' });

    // Check if email already registered
    const existingUser = await User.findOne({ where: { email: { [Op.iLike]: email.trim() } } });
    if (existingUser) {
      if (existingUser.companyId === companyId) {
        return res.status(400).json({ success: false, message: `${email} sudah terdaftar di ${company.name}.` });
      }
      return res.status(400).json({ success: false, message: `${email} sudah terdaftar di perusahaan lain.` });
    }

    // Create pre-registered user (will be activated on first Google login)
    const userCount = await User.count({ where: { companyId } });
    const employeeCode = `${company.code}-${userCount + 1}`;
    
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: targetRole,
      companyId,
      position: position || 'Staff',
      department: department || 'General',
      employeeId: employeeCode,
      joinDate: new Date(),
      employmentStatus: 'Probation',
      contractEnd: new Date(new Date().setMonth(new Date().getMonth() + 3)),
      phone: '-', address: '-', gender: '-', maritalStatus: '-',
      baseSalary: 5000000, allowance: 0,
      bankAccount: '-', bankName: '-', payrollStatus: 'Unpaid', leaveQuota: 0,
    });

    res.status(201).json({
      success: true,
      message: `${email} berhasil didaftarkan ke ${company.name} sebagai ${targetRole}!`,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        position: user.position, department: user.department,
        companyId: user.companyId, companyName: company.name,
      },
    });
  } catch (error) {
    console.error('Invite employee error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mendaftarkan karyawan.' });
  }
});

// Global delete user for Super Admin
router.delete('/users/:id', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    
    // PROTECT ROOT ADMIN
    const ROOT_EMAIL = process.env.ROOT_ADMIN_EMAIL || 'zidhan.developer@gmail.com';
    if (user.email === ROOT_EMAIL) {
      return res.status(403).json({ success: false, message: 'Akun Super Admin Utama (Root) tidak dapat dihapus.' });
    }

    if (user.id === req.user.id) return res.status(400).json({ success: false, message: 'Anda tidak dapat menghapus diri sendiri.' });
    await user.destroy();
    res.json({ success: true, message: `User "${user.name}" berhasil dihapus.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal menghapus user.' });
  }
});

// Create Global User (Invite Super Admin)
router.post('/users/global', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ success: false, message: 'Email sudah terdaftar.' });

    const newUser = await User.create({ name, email, role: role || 'super_admin', companyId: null });
    res.status(201).json({ success: true, message: 'User global berhasil didaftarkan.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Gagal mendaftarkan user global.' });
  }
});

// TRANSFER employee to another company (Super Admin only)
router.put('/transfer/:userId', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { companyId } = req.body;

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });
    if (isRootAdmin(user)) return res.status(403).json({ success: false, message: 'Root Admin tidak dapat dipindahkan.' });
    if (user.role === 'super_admin') return res.status(400).json({ success: false, message: 'Super Admin tidak terikat ke perusahaan.' });

    if (companyId) {
      const company = await Company.findByPk(companyId);
      if (!company) return res.status(404).json({ success: false, message: 'Perusahaan tujuan tidak ditemukan.' });
    }

    await user.update({ companyId: companyId || null });
    res.json({ success: true, message: `${user.name} berhasil dipindahkan.`, user });
  } catch (error) {
    console.error('Transfer employee error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal memindahkan karyawan.' });
  }
});

// ============================================================
// SUPER ADMIN: Global User Management
// ============================================================

// GET all users across companies (Super Admin only)
router.get('/users/all', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['googleId'] },
      include: [{ model: Company, as: 'company', attributes: ['id', 'name', 'code'] }],
      order: [['name', 'ASC']],
    });
    
    // Mark root admin
    const rootEmail = (process.env.ROOT_ADMIN_EMAIL || '').toLowerCase().trim();
    const result = users.map(u => {
      const obj = u.toJSON();
      obj.isRoot = rootEmail && obj.email.toLowerCase().trim() === rootEmail;
      return obj;
    });

    res.json({ success: true, users: result });
  } catch (error) {
    console.error('Get all users error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil daftar user.' });
  }
});

// UPDATE user role (Super Admin only)
router.put('/users/:id/role', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const validRoles = ['super_admin', 'admin', 'hrd', 'manager', 'employee'];
    if (!validRoles.includes(role)) return res.status(400).json({ success: false, message: 'Role tidak valid.' });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: 'User tidak ditemukan.' });

    // Root Admin protection
    if (isRootAdmin(user)) {
      return res.status(403).json({ success: false, message: 'Root Admin tidak dapat diubah rolenya.' });
    }

    await user.update({ role });
    res.json({ success: true, message: `Role ${user.name} diubah menjadi ${role}.`, user });
  } catch (error) {
    console.error('Update role error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengubah role.' });
  }
});

// Dashboard stats for Super Admin
router.get('/dashboard/stats', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const [totalCompanies, activeCompanies, totalUsers, totalSuperAdmins] = await Promise.all([
      Company.count(),
      Company.count({ where: { status: 'active' } }),
      User.count(),
      User.count({ where: { role: 'super_admin' } }),
    ]);

    // Per-company breakdown
    const companies = await Company.findAll({
      where: { status: 'active' },
      include: [{ model: User, as: 'users', attributes: ['id'] }],
      order: [['name', 'ASC']],
    });
    const companyStats = companies.map(c => ({
      id: c.id, name: c.name, code: c.code, employeeCount: (c.users || []).length,
    }));

    res.json({
      success: true,
      stats: { totalCompanies, activeCompanies, totalUsers, totalSuperAdmins, companyStats },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil statistik.' });
  }
});

module.exports = router;
