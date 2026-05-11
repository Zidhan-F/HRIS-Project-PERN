const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const PayrollSettings = sequelize.define('PayrollSettings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  latePenaltyPerDay: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 50000,
    field: 'late_penalty_per_day',
  },
  overtimeRatePerHour: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 30000,
    field: 'overtime_rate_per_hour',
  },
  workHoursStart: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 9.25, // 09:15
    field: 'work_hours_start',
  },
  overtimeStart: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 18, // 18:00
    field: 'overtime_start',
  },
  workingDaysPerMonth: {
    type: DataTypes.INTEGER,
    defaultValue: 22,
    field: 'working_days_per_month',
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at',
  },
  updatedBy: {
    type: DataTypes.STRING,
    field: 'updated_by',
  },
}, {
  tableName: 'payroll_settings',
  timestamps: false,
});

module.exports = PayrollSettings;
