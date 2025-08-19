#!/usr/bin/env node

// =================================
// 🔍 Production Readiness Verification
// =================================

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

// Colors for output
const colors = {
  red: "\033[0;31m",
  green: "\033[0;32m",
  yellow: "\033[1;33m",
  blue: "\033[0;34m",
  nc: "\033[0m", // No Color
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  const color = colors[level] || colors.nc;
  console.log(`${color}[${timestamp}] ${message}${colors.nc}`);
}

async function checkEndpoint(url, expectedStatus = 200) {
  return new Promise((resolve) => {
    const client = url.startsWith("https") ? https : http;

    const req = client.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        resolve({
          success: res.statusCode === expectedStatus,
          statusCode: res.statusCode,
          data: data,
          error: null,
        });
      });
    });

    req.on("error", (error) => {
      resolve({
        success: false,
        statusCode: null,
        data: null,
        error: error.message,
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        success: false,
        statusCode: null,
        data: null,
        error: "Request timeout",
      });
    });
  });
}

function checkFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function checkEnvironmentFile() {
  const envFiles = [".env.production", ".env.local", ".env"];

  for (const file of envFiles) {
    if (checkFileExists(file)) {
      log("green", `✅ Environment file found: ${file}`);

      const content = fs.readFileSync(file, "utf8");

      // Check for critical variables
      const criticalVars = [
        "NEXT_PUBLIC_NETWORK_MODE",
        "NEXT_PUBLIC_BASE_URL",
        "DATABASE_URL",
      ];

      const missing = criticalVars.filter(
        (varName) => !content.includes(varName)
      );

      if (missing.length === 0) {
        log("green", "✅ All critical environment variables present");
        return true;
      } else {
        log("red", `❌ Missing environment variables: ${missing.join(", ")}`);
        return false;
      }
    }
  }

  log("red", "❌ No environment file found");
  return false;
}

function checkProjectStructure() {
  const criticalFiles = [
    "package.json",
    "next.config.js",
    "Dockerfile",
    "docker-compose.yml",
    "scripts/deploy.sh",
    "nginx.conf",
    "src/app/api/health/route.ts",
    "src/lib/database.ts",
    "src/lib/migrations.ts",
  ];

  let allPresent = true;

  criticalFiles.forEach((file) => {
    if (checkFileExists(file)) {
      log("green", `✅ ${file} exists`);
    } else {
      log("red", `❌ ${file} missing`);
      allPresent = false;
    }
  });

  return allPresent;
}

async function checkDatabaseStatus() {
  try {
    const { exec } = require("child_process");

    return new Promise((resolve) => {
      exec(
        "npm run db:status",
        { cwd: process.cwd() },
        (error, stdout, stderr) => {
          if (error) {
            log("red", `❌ Database check failed: ${error.message}`);
            resolve(false);
          } else {
            log("green", "✅ Database status check passed");
            resolve(true);
          }
        }
      );
    });
  } catch (error) {
    log("red", `❌ Database check error: ${error.message}`);
    return false;
  }
}

async function checkBuildStatus() {
  try {
    const buildDir = ".next";
    if (checkFileExists(buildDir)) {
      log("green", "✅ Production build exists");
      return true;
    } else {
      log("yellow", "⚠️  No production build found - run npm run build");
      return false;
    }
  } catch (error) {
    log("red", `❌ Build check error: ${error.message}`);
    return false;
  }
}

async function runHealthCheck(baseUrl = "http://localhost:3000") {
  log("blue", `Checking health endpoint: ${baseUrl}/api/health`);

  const result = await checkEndpoint(`${baseUrl}/api/health`);

  if (result.success) {
    log("green", "✅ Health check passed");

    try {
      const healthData = JSON.parse(result.data);
      log("blue", `Environment: ${healthData.environment || "unknown"}`);
      log("blue", `Database: ${healthData.services?.database || "unknown"}`);
      log("blue", `API: ${healthData.services?.api || "unknown"}`);
      return true;
    } catch {
      log("yellow", "⚠️  Health endpoint returned non-JSON response");
      return true; // Still consider it a success if endpoint responds
    }
  } else {
    log(
      "red",
      `❌ Health check failed: ${result.error || `Status ${result.statusCode}`}`
    );
    return false;
  }
}

async function checkConfigEndpoint(baseUrl = "http://localhost:3000") {
  log("blue", `Checking config endpoint: ${baseUrl}/api/config`);

  const result = await checkEndpoint(`${baseUrl}/api/config`);

  if (result.success) {
    try {
      const configData = JSON.parse(result.data);
      log("green", "✅ Config endpoint working");
      log("blue", `Network mode: ${configData.network?.mode || "unknown"}`);
      log("blue", `App name: ${configData.app?.name || "unknown"}`);
      return true;
    } catch {
      log("red", "❌ Config endpoint returned invalid JSON");
      return false;
    }
  } else {
    log(
      "red",
      `❌ Config endpoint failed: ${
        result.error || `Status ${result.statusCode}`
      }`
    );
    return false;
  }
}

function checkDockerSetup() {
  const dockerFiles = ["Dockerfile", "docker-compose.yml", ".dockerignore"];
  let allPresent = true;

  dockerFiles.forEach((file) => {
    if (checkFileExists(file)) {
      log("green", `✅ ${file} exists`);
    } else {
      log("red", `❌ ${file} missing`);
      allPresent = false;
    }
  });

  return allPresent;
}

function printSummary(results) {
  console.log("\n" + "=".repeat(50));
  log("blue", "PRODUCTION READINESS SUMMARY");
  console.log("=".repeat(50));

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  results.forEach((result) => {
    const icon = result.passed ? "✅" : "❌";
    const color = result.passed ? "green" : "red";
    log(color, `${icon} ${result.name}`);
  });

  console.log("\n" + "=".repeat(50));

  if (passed === total) {
    log("green", `🎉 ALL CHECKS PASSED (${passed}/${total})`);
    log("green", "🚀 YOUR PLATFORM IS PRODUCTION READY!");
  } else {
    log("red", `❌ ${total - passed} CHECKS FAILED (${passed}/${total})`);
    log(
      "yellow",
      "⚠️  Please fix the failing checks before production deployment"
    );
  }

  console.log("=".repeat(50) + "\n");
}

async function main() {
  const baseUrl = process.argv[2] || "http://localhost:3000";

  log("blue", "🔍 Starting Production Readiness Verification...");
  log("blue", `Target URL: ${baseUrl}\n`);

  const results = [];

  // Check project structure
  log("blue", "📁 Checking project structure...");
  results.push({
    name: "Project Structure",
    passed: checkProjectStructure(),
  });

  // Check environment configuration
  log("blue", "\n🔧 Checking environment configuration...");
  results.push({
    name: "Environment Configuration",
    passed: checkEnvironmentFile(),
  });

  // Check Docker setup
  log("blue", "\n🐳 Checking Docker setup...");
  results.push({
    name: "Docker Configuration",
    passed: checkDockerSetup(),
  });

  // Check build status
  log("blue", "\n🏗️  Checking build status...");
  results.push({
    name: "Production Build",
    passed: await checkBuildStatus(),
  });

  // Check database
  log("blue", "\n🗄️  Checking database...");
  results.push({
    name: "Database Setup",
    passed: await checkDatabaseStatus(),
  });

  // Check health endpoint
  log("blue", "\n🏥 Checking health endpoint...");
  results.push({
    name: "Health Endpoint",
    passed: await runHealthCheck(baseUrl),
  });

  // Check config endpoint
  log("blue", "\n⚙️  Checking config endpoint...");
  results.push({
    name: "Config Endpoint",
    passed: await checkConfigEndpoint(baseUrl),
  });

  // Print summary
  printSummary(results);

  // Exit with appropriate code
  const allPassed = results.every((r) => r.passed);
  process.exit(allPassed ? 0 : 1);
}

if (require.main === module) {
  main().catch((error) => {
    log("red", `❌ Verification failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { main, runHealthCheck, checkConfigEndpoint };
