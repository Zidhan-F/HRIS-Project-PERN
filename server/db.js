const { Sequelize } = require('sequelize');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:zidhan24@localhost:5432/ems_db';
const isLocalhost = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: isLocalhost ? {} : {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  define: {
    underscored: true, // Use snake_case for all auto-generated fields
    timestamps: false, // We manage timestamps manually
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

module.exports = sequelize;
