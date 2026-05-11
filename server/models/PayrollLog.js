const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const PayrollLog = sequelize.define('PayrollLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  action: {
    type: DataTypes.ENUM(
      'AUTO_CALC', 'FINALIZE_SINGLE', 'FINALIZE_ALL',
      'MARK_PAID_SINGLE', 'MARK_PAID_ALL',
      'MARK_UNPAID_SINGLE', 'MARK_UNPAID_ALL',
      'SEND_EMAILS', 'EXPORT_BANK', 'SINGLE_UPDATE'
    ),
    allowNull: false,
  },
  performedBy: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'performed_by',
  },
  periodMonth: {
    type: DataTypes.INTEGER,
    field: 'period_month',
  },
  periodYear: {
    type: DataTypes.INTEGER,
    field: 'period_year',
  },
  entitiesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'entities_count',
  },
  details: {
    type: DataTypes.TEXT,
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'payroll_logs',
  timestamps: false,
});

module.exports = PayrollLog;
