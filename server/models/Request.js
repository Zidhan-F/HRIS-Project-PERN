const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Request = sequelize.define('Request', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    field: 'user_id',
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
  type: {
    type: DataTypes.ENUM('Leave', 'Permit', 'Sick', 'Overtime', 'Reimbursement', 'Timesheet', 'Expense', 'Other'),
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATE,
    field: 'start_date',
  },
  endDate: {
    type: DataTypes.DATE,
    field: 'end_date',
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected', 'Returned'),
    defaultValue: 'Pending',
  },
  unpaidDays: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'unpaid_days',
  },
  isUnpaid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_unpaid',
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'requests',
  timestamps: false,
});

module.exports = Request;
