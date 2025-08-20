const solc = require("solc");
const fs = require("fs");
const path = require("path");

/**
 * Compile Solidity contracts and generate bytecode
 */
function compileContract(contractName) {
  try {
    console.log(`📝 Compiling ${contractName}...`);

    // Read the contract source code
    const contractPath = path.join(__dirname, `${contractName}.sol`);
    const source = fs.readFileSync(contractPath, "utf8");

    // Prepare the input for the compiler
    const input = {
      language: "Solidity",
      sources: {
        [`${contractName}.sol`]: {
          content: source,
        },
      },
      settings: {
        outputSelection: {
          "*": {
            "*": ["abi", "evm.bytecode"],
          },
        },
        optimizer: {
          enabled: true,
          runs: 200,
        },
      },
    };

    // Compile the contract
    const compiled = JSON.parse(solc.compile(JSON.stringify(input)));

    // Check for compilation errors
    if (compiled.errors) {
      compiled.errors.forEach((error) => {
        if (error.severity === "error") {
          console.error("❌ Compilation error:", error.formattedMessage);
          throw new Error(`Compilation failed: ${error.message}`);
        } else {
          console.warn("⚠️ Compilation warning:", error.formattedMessage);
        }
      });
    }

    // Extract the compiled contract
    const contract = compiled.contracts[`${contractName}.sol`][contractName];

    if (!contract) {
      throw new Error(
        `Contract ${contractName} not found in compilation output`
      );
    }

    const abi = contract.abi;
    const bytecode = contract.evm.bytecode.object;

    console.log(`✅ ${contractName} compiled successfully!`);
    console.log(`📊 Bytecode size: ${bytecode.length / 2} bytes`);

    // Save compilation artifacts
    const artifactsDir = path.join(__dirname, "artifacts");
    if (!fs.existsSync(artifactsDir)) {
      fs.mkdirSync(artifactsDir);
    }

    const artifact = {
      contractName,
      abi,
      bytecode: `0x${bytecode}`,
      compiledAt: new Date().toISOString(),
      compiler: {
        name: "solc",
        version: solc.version(),
      },
    };

    const artifactPath = path.join(artifactsDir, `${contractName}.json`);
    fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));

    console.log(`📄 Artifacts saved to: ${artifactPath}`);

    return artifact;
  } catch (error) {
    console.error(`❌ Failed to compile ${contractName}:`, error.message);
    throw error;
  }
}

/**
 * Load compiled contract artifacts
 */
function loadArtifact(contractName) {
  try {
    const artifactPath = path.join(
      __dirname,
      "artifacts",
      `${contractName}.json`
    );

    if (!fs.existsSync(artifactPath)) {
      throw new Error(`Artifact not found: ${artifactPath}`);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    return artifact;
  } catch (error) {
    console.error(
      `❌ Failed to load artifact for ${contractName}:`,
      error.message
    );
    throw error;
  }
}

// Export functions
module.exports = {
  compileContract,
  loadArtifact,
};

// Run compilation if called directly
if (require.main === module) {
  const contractName = process.argv[2] || "TestUSDT";

  try {
    compileContract(contractName);
    console.log(`✅ ${contractName} compilation completed!`);
    process.exit(0);
  } catch (error) {
    console.error(`❌ ${contractName} compilation failed:`, error);
    process.exit(1);
  }
}
