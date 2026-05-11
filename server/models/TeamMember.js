const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const TeamMember = sequelize.define('TeamMember', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: { model: 'users', key: 'id' },
  },
  memberName: {
    type: DataTypes.STRING,
    field: 'member_name',
  },
  memberEmail: {
    type: DataTypes.STRING,
    field: 'member_email',
  },
  memberPosition: {
    type: DataTypes.STRING,
    field: 'member_position',
  },
}, {
  tableName: 'team_members',
  timestamps: false,
});

module.exports = TeamMember;
