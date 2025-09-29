const { Sequelize } = require("sequelize");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Debug environment variables
console.log("=== Environment Variables Debug ===");
console.log("PGHOST:", process.env.PGHOST || "undefined (using default: localhost)");
console.log("PGPORT:", process.env.PGPORT || "undefined (using default: 5432)");
console.log("PGDATABASE:", process.env.PGDATABASE || "undefined (using default: apivault)");
console.log("PGUSER:", process.env.PGUSER || "undefined (using default: postgres)");
console.log("PGPASSWORD:", process.env.PGPASSWORD ? "***set***" : "undefined (using default: empty)");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "***set***" : "undefined");
console.log("");

// Test different connection configurations for port 5435
const configs = [
  {
    name: "localhost:5435",
    config: {
      database: "apivault",
      username: "postgres", 
      password: "123",
      host: "localhost",
      port: 5435,
      dialect: "postgres",
      logging: console.log,
    }
  },
  {
    name: "127.0.0.1:5435",
    config: {
      database: "apivault",
      username: "postgres", 
      password: "123",
      host: "127.0.0.1",
      port: 5435,
      dialect: "postgres",
      logging: console.log,
    }
  },
  {
    name: "Environment Variables (port 5435)",
    config: {
      database: process.env.PGDATABASE || "apivault",
      username: process.env.PGUSER || "postgres",
      password: process.env.PGPASSWORD || "123",
      host: process.env.PGHOST || "127.0.0.1",
      port: 5435, // Force port 5435
      dialect: "postgres",
      logging: console.log,
    }
  }
];

// Add DATABASE_URL config if available
if (process.env.DATABASE_URL) {
  configs.push({
    name: "DATABASE_URL",
    config: {
      url: process.env.DATABASE_URL,
      dialect: "postgres",
      logging: console.log,
    }
  });
}

async function testConnection(config, name) {
  console.log(`\n=== Testing: ${name} ===`);
  console.log("Config:", JSON.stringify(config, null, 2));
  
  const sequelize = new Sequelize(config);
  
  try {
    console.log("Attempting to connect...");
    await sequelize.authenticate();
    console.log("✅ SUCCESS: Connection established successfully!");
    
    // Test a simple query
    const [results] = await sequelize.query("SELECT version()");
    console.log("✅ Database version:", results[0].version);
    
    await sequelize.close();
    return true;
  } catch (error) {
    console.log("❌ FAILED: Connection failed");
    console.log("Error name:", error.name);
    console.log("Error code:", error.code);
    console.log("Error message:", error.message);
    
    if (error.parent) {
      console.log("Parent error:", error.parent.message);
      console.log("Parent code:", error.parent.code);
    }
    
    if (error.original) {
      console.log("Original error:", error.original.message);
      console.log("Original code:", error.original.code);
    }
    
    console.log("Full error:", error);
    return false;
  }
}

async function runTests() {
  console.log("🔍 Starting Sequelize Connection Tests...\n");
  
  let successCount = 0;
  
  for (const { name, config } of configs) {
    const success = await testConnection(config, name);
    if (success) successCount++;
  }
  
  console.log(`\n=== Test Summary ===`);
  console.log(`Successful connections: ${successCount}/${configs.length}`);
  
  if (successCount === 0) {
    console.log("\n🔧 Troubleshooting Tips for Port 5435:");
    console.log("1. Check if PostgreSQL is running on port 5435: netstat -an | findstr :5435");
    console.log("2. Verify PostgreSQL is configured to listen on port 5435");
    console.log("3. Check if the database 'apivault' exists");
    console.log("4. Verify username/password are correct");
    console.log("5. Check if PostgreSQL accepts connections from localhost/127.0.0.1");
    console.log("6. Try connecting with psql: psql -h 127.0.0.1 -p 5435 -U postgres -d apivault");
    console.log("7. Check PostgreSQL config file (postgresql.conf) for port setting");
    console.log("8. Check if another service is using port 5435");
  } else {
    console.log("\n✅ At least one connection method works! Use the successful config in your app.");
  }
}

// Run the tests
runTests().catch(console.error);
