const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ApiKey = sequelize.define(
    "ApiKey",
    {
      userId: { type: DataTypes.STRING, allowNull: false },
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      keyName: { type: DataTypes.STRING, allowNull: false },
      service: { type: DataTypes.STRING, allowNull: false },
      apiKey: { type: DataTypes.TEXT, allowNull: false },
      rateLimit: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1000 },
      expiresAt: { type: DataTypes.DATE, allowNull: true },
      ipWhitelist: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true },
    },
    {
      tableName: "api_keys",
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ["user_id", "api_key"],
        },
      ],
    }
  );

  return ApiKey;
};
