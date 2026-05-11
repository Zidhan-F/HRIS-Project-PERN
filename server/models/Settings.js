const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Settings = sequelize.define('Settings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  key: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  value: {
    type: DataTypes.JSONB, // Replaces Mongoose Mixed type
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at',
  },
}, {
  tableName: 'settings',
  timestamps: false,
});

module.exports = Settings;
