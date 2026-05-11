const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  googleId: {
    type: DataTypes.STRING,
    field: 'google_id',
  },
  role: {
    type: DataTypes.ENUM('employee', 'hrd', 'manager', 'admin'),
    defaultValue: 'employee',
  },
  position: {
    type: DataTypes.STRING,
    defaultValue: 'Staff',
  },
  profilePicture: {
    type: DataTypes.TEXT,
    field: 'profile_picture',
  },
  bio: {
    type: DataTypes.STRING(250),
    defaultValue: '-',
  },
  // Personal Info
  phone: {
    type: DataTypes.STRING,
    defaultValue: '-',
  },
  address: {
    type: DataTypes.TEXT,
    defaultValue: '-',
  },
  birthday: {
    type: DataTypes.DATEONLY,
  },
  gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other', '-'),
    defaultValue: '-',
  },
  maritalStatus: {
    type: DataTypes.STRING,
    defaultValue: '-',
    field: 'marital_status',
  },
  // Contract Info
  employeeId: {
    type: DataTypes.STRING,
    defaultValue: 'EMS-000',
    field: 'employee_id_code',
  },
  joinDate: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
    field: 'join_date',
  },
  employmentStatus: {
    type: DataTypes.STRING,
    defaultValue: 'Probation',
    field: 'employment_status',
  },
  contractEnd: {
    type: DataTypes.DATEONLY,
    field: 'contract_end',
  },
  // Team Info
  department: {
    type: DataTypes.STRING,
    defaultValue: 'General',
  },
  manager: {
    type: DataTypes.STRING,
    defaultValue: 'HR Manager',
  },
  // Payroll Info
  baseSalary: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 5000000,
    field: 'base_salary',
  },
  allowance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
  },
  bankAccount: {
    type: DataTypes.STRING,
    defaultValue: '-',
    field: 'bank_account',
  },
  bankName: {
    type: DataTypes.STRING,
    defaultValue: '-',
    field: 'bank_name',
  },
  ptkpStatus: {
    type: DataTypes.ENUM('TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'),
    defaultValue: 'TK/0',
    field: 'ptkp_status',
  },
  mealAllowanceRate: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 25000,
    field: 'meal_allowance_rate',
  },
  transportAllowanceRate: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 20000,
    field: 'transport_allowance_rate',
  },
  bpjsKesehatanAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 1,
    field: 'bpjs_kesehatan_amount',
  },
  bpjsTkAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 1,
    field: 'bpjs_tk_amount',
  },
  pph21Amount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 1,
    field: 'pph21_amount',
  },
  payrollStatus: {
    type: DataTypes.ENUM('Unpaid', 'Paid'),
    defaultValue: 'Unpaid',
    field: 'payroll_status',
  },
  leaveQuota: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'leave_quota',
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at',
  },
}, {
  tableName: 'users',
  timestamps: false,
});

module.exports = User;