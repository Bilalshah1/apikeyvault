const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ApiKey = sequelize.define(
    "ApiKey",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      keyName: { type: DataTypes.STRING, allowNull: false },
      service: { type: DataTypes.STRING, allowNull: false },
      apiKey: { type: DataTypes.TEXT, allowNull: false, unique: true },
      rateLimit: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1000 },
      expiresAt: { type: DataTypes.DATE, allowNull: true },
      ipWhitelist: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true },
    },
    {
      tableName: "api_keys",
      timestamps: true,
      underscored: true,
    }
  );

  return ApiKey;
};
