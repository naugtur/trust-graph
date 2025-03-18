const Ajv = require("ajv");

const schema = require("./attestation.schema.json");
const exampleData = require("../example.json");

const ajv = new Ajv();

const validate = ajv.compile(schema);

const valid = validate(exampleData);

if (valid) {
  console.log("Validation successful. The example JSON is valid.");
} else {
  console.log("Validation failed. Errors:");
  console.dir(validate.errors, { depth: null });
}
