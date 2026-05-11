const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://postgres:zidhan24@localhost:5432/ems_db', {
  dialect: 'postgres',
  logging: false,
  define: {
    underscored: true, // Use snake_case for all auto-generated fields
    timestamps: false,  // We manage timestamps manually
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

module.exports = sequelize;
