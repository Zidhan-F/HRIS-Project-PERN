const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Attendance = sequelize.define('Attendance', {
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
  },
  name: {
    type: DataTypes.STRING,
  },
  profilePicture: {
    type: DataTypes.TEXT,
    field: 'profile_picture',
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 7),
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7),
  },
  type: {
    type: DataTypes.ENUM('clock_in', 'clock_out'),
    defaultValue: 'clock_in',
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'attendances',
  timestamps: false,
  indexes: [
    { fields: ['email'] },
    { fields: ['timestamp'] },
    { fields: ['email', 'timestamp'] },
  ],
});

module.exports = Attendance;
