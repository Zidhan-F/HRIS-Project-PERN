const User = require('./User');
const Company = require('./Company');
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

// Company Associations
Company.hasMany(User, { foreignKey: 'company_id', as: 'users' });
User.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

Company.hasMany(Attendance, { foreignKey: 'company_id', as: 'attendances' });
Attendance.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

Company.hasMany(Payroll, { foreignKey: 'company_id', as: 'payrolls' });
Payroll.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

Company.hasMany(Request, { foreignKey: 'company_id', as: 'requests' });
Request.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

Company.hasMany(Settings, { foreignKey: 'company_id', as: 'settings' });
Settings.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

Company.hasMany(PayrollSettings, { foreignKey: 'company_id', as: 'payrollSettings' });
PayrollSettings.belongsTo(Company, { foreignKey: 'company_id', as: 'company' });

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
  Company,
  Attendance,
  Request,
  Payroll,
  PayrollLog,
  PayrollSettings,
  Settings,
  TeamMember,
};
