const { test, suite } = require("node:test");
const Ajv = require("ajv");

const schema = require("../attestation.schema.json");

const ajv = new Ajv();
const validate = ajv.compile(schema);

const testInvalid = (description, data) => {
  test(description, (t) => {
    const isValid = validate(data);
    t.assert.ok(!isValid, "expected to fail the validation");
    t.assert.snapshot({
      errors: validate.errors,
    });
  });
};
const testValid = (description, data) => {
  test(description, (t) => {
    const isValid = validate(data);
    t.assert.ok(isValid, "expected successful validation");
  });
};

suite("attestation schema", () => {
  testValid("valid example", {
    attestations: [
      {
        issuer: "@openssf/i_trust",
        issuerSpecificID: "sc-2023-05-15-001",
        claim: 1,
        comment: "Package has good security practices",
        subject: {
          pkg: {
            name: "express",
            range: ">=5.0.0",
          },
        },
      },
      {
        issuer: "@express/i_trust",
        issuerSpecificID: "1",
        claim: -1,
        comment:
          "vulnerability in lodash as used by express is not affecting it",
        subject: {
          dependency: {
            dependent: {
              name: "express",
            },
            pkg: {
              name: "lodash",
              range: "3.4.1",
            },
          },
          flaw: {
            ghsa: "GHSA-p6mc-m468-83gw",
            url: "https://github.com/advisories/GHSA-p6mc-m468-83gw",
          },
        },
      },
      {
        issuer: "@npmjs/i_trust",
        issuerSpecificID: "npm-audit-2023-06-01-002",
        claim: -1,
        comment: "Disputing the attestation",
        subject: {
          attestation: {
            issuer: "@openssf/i_trust",
            issuerSpecificID: "sc-2023-05-15-001",
          },
        },
      },
    ],
  });

  testValid("validates minimal valid attestation", {
    attestations: [
      {
        issuer: "test",
        issuerSpecificID: "1",
        claim: 1,
        subject: {
          pkg: {
            name: "test-package",
          },
        },
      },
    ],
  });

  testValid("validates attestation with dependency subject", {
    attestations: [
      {
        issuer: "test",
        issuerSpecificID: "1",
        claim: 1,
        subject: {
          dependency: {
            dependent: {
              name: "package-a",
            },
            pkg: {
              name: "package-b",
              range: "1.0.0",
            },
          },
        },
      },
    ],
  });

  testValid("validates attestation with flaw subject", {
    attestations: [
      {
        issuer: "test",
        issuerSpecificID: "1",
        claim: -1,
        subject: {
          flaw: {
            cve: "CVE-2023-1234",
            url: "https://example.com",
          },
        },
      },
    ],
  });

  testValid("validates attestation with attestation subject", {
    attestations: [
      {
        issuer: "test",
        issuerSpecificID: "1",
        claim: -1,
        subject: {
          attestation: {
            issuer: "other-issuer",
            issuerSpecificID: "123",
          },
        },
      },
    ],
  });

  testInvalid("rejects empty object", {});

  testInvalid("rejects missing attestations array", {
    something: [],
  });

  testInvalid("rejects attestation without required fields", {
    attestations: [
      {
        issuer: "test",
        subject: {
          pkg: {
            name: "test-package",
          },
        },
      },
    ],
  });

  testInvalid(
    "rejects attestation missing issuerSpecificID in dependency subject",
    {
      attestations: [
        {
          issuer: "@express/i_trust",
          claim: -1,
          comment: "vulnerability in lodash",
          subject: {
            dependency: {
              dependent: {
                name: "express",
              },
              pkg: {
                name: "lodash",
                range: "3.4.1",
              },
            },
          },
        },
      ],
    }
  );

  testInvalid("rejects attestation missing pkg name in dependency subject", {
    attestations: [
      {
        issuer: "@express/i_trust",
        issuerSpecificID: "1",
        claim: -1,
        subject: {
          dependency: {
            dependent: {
              name: "express",
            },
            pkg: {
              range: "3.4.1",
            },
          },
        },
      },
    ],
  });

  testInvalid("rejects attestation missing both fields in flaw subject", {
    attestations: [
      {
        issuer: "@express/i_trust",
        issuerSpecificID: "1",
        claim: -1,
        subject: {
          flaw: {},
        },
      },
    ],
  });

  testInvalid("rejects attestation missing fields in attestation subject", {
    attestations: [
      {
        issuer: "@npmjs/i_trust",
        issuerSpecificID: "123",
        claim: -1,
        subject: {
          attestation: {
            issuer: "@openssf/i_trust",
          },
        },
      },
    ],
  });
});
