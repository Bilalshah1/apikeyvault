const { Sequelize } = require("sequelize");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

console.log("=== App Connection Debug ===");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "set" : "not set");

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully!");
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
  }
})();

const ApiKey = require("./apiKey")(sequelize);
const User = require("./user")(sequelize);

module.exports = {
  sequelize,
  ApiKey,
  User,
};
