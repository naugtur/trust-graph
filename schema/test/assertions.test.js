const { test, suite } = require("node:test");
const Ajv = require("ajv");

const schema = require("../assertion.schema.json");

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
    if(validate.errors) {
      console.error(`\n----${description}-----\n`,validate.errors,"\n----\n");
    }
    t.assert.ok(isValid, "expected successful validation");
  });
};

suite("assertion schema", () => {
  testValid("valid example", {
    assertions: [
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
        comment: "Disputing the assertion",
        subject: {
          assertion: {
            issuer: "@openssf/i_trust",
            issuerSpecificID: "sc-2023-05-15-001",
          },
        },
      },
    ],
  });

  testValid("validates minimal valid assertion", {
    assertions: [
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

  testValid("validates assertion with dependency subject", {
    assertions: [
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

  testValid("validates assertion with flaw subject", {
    assertions: [
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

  testValid("validates assertion with assertion subject", {
    assertions: [
      {
        issuer: "test",
        issuerSpecificID: "1",
        claim: -1,
        subject: {
          assertion: {
            issuer: "other-issuer",
            issuerSpecificID: "123",
          },
        },
      },
    ],
  });

  testInvalid("rejects empty object", {});

  testInvalid("rejects missing assertions array", {
    something: [],
  });

  testInvalid("rejects assertion without required fields", {
    assertions: [
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
    "rejects assertion missing issuerSpecificID in dependency subject",
    {
      assertions: [
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

  testInvalid("rejects assertion missing pkg name in dependency subject", {
    assertions: [
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

  testInvalid("rejects assertion missing both fields in flaw subject", {
    assertions: [
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

  testInvalid("rejects assertion missing fields in assertion subject", {
    assertions: [
      {
        issuer: "@npmjs/i_trust",
        issuerSpecificID: "123",
        claim: -1,
        subject: {
          assertion: {
            issuer: "@openssf/i_trust",
          },
        },
      },
    ],
  });
});
