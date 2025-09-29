const express = require("express");
const cors = require("cors");
const { sequelize } = require("./models");

const app = express();
const PORT = process.env.PORT || 5000;

const apiKeyRoutes = require("./routes/apiKeyRoutes");
const healthRoutes = require("./routes/healthRoutes");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");

app.use(cors());
app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/api/keys", apiKeyRoutes);
app.use("/api/health", healthRoutes);


app.get("/", (req, res) => {
  res.send("API Key Vault backend server is running ");
});

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error(" Sync error:", err);
    process.exit(1);
  }
})();
