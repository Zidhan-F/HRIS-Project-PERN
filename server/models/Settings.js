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
    allowNull: false,
  },
  value: {
    type: DataTypes.JSONB,
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'updated_at',
  },
}, {
  tableName: 'settings',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['company_id', 'key'],
    },
  ],
});

module.exports = Settings;
