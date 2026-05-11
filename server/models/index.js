const User = require('./User');
const Attendance = require('./Attendance');
const Request = require('./Request');
const Payroll = require('./Payroll');
const PayrollLog = require('./PayrollLog');
const PayrollSettings = require('./PayrollSettings');
const Settings = require('./Settings');
const TeamMember = require('./TeamMember');

// ============================================================
// ASSOCIATIONS
// ============================================================

// User has many Attendances
User.hasMany(Attendance, { foreignKey: 'user_id', as: 'attendances' });
Attendance.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User has many Requests
User.hasMany(Request, { foreignKey: 'user_id', as: 'requests' });
Request.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User has many Payrolls
User.hasMany(Payroll, { foreignKey: 'employee_id', as: 'payrolls' });
Payroll.belongsTo(User, { foreignKey: 'employee_id', as: 'employee' });

// User has many TeamMembers
User.hasMany(TeamMember, { foreignKey: 'user_id', as: 'teamMembers' });
TeamMember.belongsTo(User, { foreignKey: 'user_id', as: 'manager' });

module.exports = {
  User,
  Attendance,
  Request,
  Payroll,
  PayrollLog,
  PayrollSettings,
  Settings,
  TeamMember,
};
