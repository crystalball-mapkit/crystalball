module.exports = {
  development: {
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB_NAME,
    host: `${process.env.POSTGRES_DB_NAME}_db`,
    port: "5432",
    dialect: "postgres",
  },
  test: {
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB_NAME,
    host: `${process.env.POSTGRES_DB_NAME}_db`,
    port: "5432",
    dialect: "postgres",
  },
  production: {
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB_NAME,
    host: `${process.env.POSTGRES_DB_NAME}_db`,
    port: "5432",
    dialect: "postgres",
  },
};
