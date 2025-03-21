const Ajv = require("ajv");
const fs = require("fs");
const path = require("path");

const schema = require("./assertion.schema.json");
const ajv = new Ajv();
const validate = ajv.compile(schema);

/**
 * Validates a JSON file against the schema
 * @param {string} filePath - Path to the JSON file
 */
function validateFile(filePath) {
  try {
    // Read and parse the file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);
    
    // Validate against schema
    const valid = validate(jsonData);
    
    if (valid) {
      // For success, just a single line
      console.log(`[ VALID ]  ${filePath}`);
    } else {
      // For errors, more detailed output
      console.log(`[ INVALID ]  ${filePath}`);
      console.log("-".repeat(80));
      validate.errors.forEach((error, index) => {
        console.log(`  _${index + 1}_ ${error.instancePath}: ${error.message}`);
        if (error.params) {
          console.log(`     Details: ${JSON.stringify(error.params)}`);
        }
      });
    }
  } catch (error) {
    console.log(`[ ERROR ]  ${filePath}`);
    
    if (error.code === 'ENOENT') {
      console.log(`  File not found`);
    } else if (error instanceof SyntaxError) {
      console.log(`  Invalid JSON syntax`);
      console.log(`  _Details_ ${error.message}`);
    } else {
      console.log(`  Unexpected error: ${error.message}`);
    }
    console.log("-".repeat(80));
  }
}

// Get file paths from command line arguments
const filePaths = process.argv.slice(2);

if (filePaths.length === 0) {
  console.log("Usage: node validate.js <file1.json> <file2.json> ...");
  console.log("Example: node validate.js ../example.json");
  process.exit(1);
}

// Process each file
filePaths.forEach(validateFile);
