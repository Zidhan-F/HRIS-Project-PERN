const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Payroll = sequelize.define('Payroll', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  employeeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'employee_id',
    references: { model: 'users', key: 'id' },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  position: {
    type: DataTypes.STRING,
    defaultValue: 'Staff',
  },
  department: {
    type: DataTypes.STRING,
    defaultValue: 'General',
  },
  employeeCode: {
    type: DataTypes.STRING,
    defaultValue: 'EMS-000',
    field: 'employee_code',
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
  profilePicture: {
    type: DataTypes.TEXT,
    field: 'profile_picture',
  },

  // Period (flattened from nested object)
  periodMonth: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'period_month',
  },
  periodYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'period_year',
  },

  // === KOMPONEN PENDAPATAN ===
  baseSalary: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'base_salary' },
  overtimePay: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'overtime_pay' },
  overtimeHours: { type: DataTypes.DECIMAL(10, 1), defaultValue: 0, field: 'overtime_hours' },
  mealAllowance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'meal_allowance' },
  transportAllowance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'transport_allowance' },
  reimbursement: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
  otherAllowance: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'other_allowance' },

  // === KOMPONEN POTONGAN ===
  latePenalty: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'late_penalty' },
  lateDays: { type: DataTypes.INTEGER, defaultValue: 0, field: 'late_days' },
  unpaidLeaveDays: { type: DataTypes.INTEGER, defaultValue: 0, field: 'unpaid_leave_days' },
  unpaidLeaveDeduction: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'unpaid_leave_deduction' },
  bpjsKesehatan: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'bpjs_kesehatan' },
  bpjsKetenagakerjaan: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'bpjs_ketenagakerjaan' },
  pph21: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },

  // === SUMMARY ===
  grossPay: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'gross_pay' },
  totalDeductions: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'total_deductions' },
  netPay: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'net_pay' },

  // === RATES USED (Historical Accuracy) ===
  overtimeRatePerHour: { type: DataTypes.DECIMAL(15, 2), field: 'overtime_rate_per_hour' },
  mealAllowanceRate: { type: DataTypes.DECIMAL(15, 2), field: 'meal_allowance_rate' },
  transportAllowanceRate: { type: DataTypes.DECIMAL(15, 2), field: 'transport_allowance_rate' },
  latePenaltyPerDay: { type: DataTypes.DECIMAL(15, 2), field: 'late_penalty_per_day' },
  bpjsKesehatanRate: { type: DataTypes.DECIMAL(5, 4), field: 'bpjs_kesehatan_rate' },
  bpjsKetenagakerjaanRate: { type: DataTypes.DECIMAL(5, 4), field: 'bpjs_ketenagakerjaan_rate' },

  // === ATTENDANCE SUMMARY (flattened) ===
  daysPresent: { type: DataTypes.INTEGER, defaultValue: 0, field: 'days_present' },
  daysLateAtt: { type: DataTypes.INTEGER, defaultValue: 0, field: 'days_late_att' },
  overtimeHoursAtt: { type: DataTypes.DECIMAL(10, 1), defaultValue: 0, field: 'overtime_hours_att' },
  totalWorkHours: { type: DataTypes.DECIMAL(10, 1), defaultValue: 0, field: 'total_work_hours' },

  // === TAX INFO ===
  ptkpStatus: { type: DataTypes.STRING, defaultValue: 'TK/0', field: 'ptkp_status' },
  ptkpAmount: { type: DataTypes.DECIMAL(15, 2), defaultValue: 54000000, field: 'ptkp_amount' },
  taxableIncomeYearly: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'taxable_income_yearly' },

  // === STATUS ===
  status: {
    type: DataTypes.ENUM('Draft', 'Finalized', 'Paid'),
    defaultValue: 'Draft',
  },

  // === METADATA ===
  emailSent: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'email_sent' },
  emailSentAt: { type: DataTypes.DATE, field: 'email_sent_at' },
  calculatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'calculated_at' },
  calculatedBy: { type: DataTypes.STRING, defaultValue: 'system', field: 'calculated_by' },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' },
}, {
  tableName: 'payrolls',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['employee_id', 'period_month', 'period_year'],
      name: 'payrolls_employee_period_unique',
    },
  ],
});

module.exports = Payroll;
