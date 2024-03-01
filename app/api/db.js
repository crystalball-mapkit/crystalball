const Sequelize = require('sequelize')

const config = {
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB_NAME,
  host: `${process.env.POSTGRES_DB_NAME}_db`,
  port: process.env.POSTGRES_PORT || 5432,
  dialect: "postgres",
};

const sequelize = new Sequelize(config.database, config.username, config.password, {
  host: config.host || 'localhost',
  dialect: 'postgres',
  port: config.port,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  operatorsAliases: false
});

module.exports = sequelize

