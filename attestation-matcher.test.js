const { test, suite } = require("node:test");
const assert = require("node:assert");
const matchAttestations = require("./attestation-matcher");
const exampleData = require("./schema/example.json");

const attestations = exampleData.attestations;

suite("attestation-matcher", () => {
  test("matches package by name and version range", async (t) => {
    const search = {
      pkg: {
        name: attestations[0].subject.pkg.name,
        range: attestations[0].subject.pkg.range.replace(">=", ""),
      },
    };
    const matches = matchAttestations(search, attestations);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].issuer, attestations[0].issuer);
  });

  test("matches dependency attestation", async (t) => {
    const search = {
      dependency: {
        dependent: { name: attestations[1].subject.dependency.dependent.name },
        pkg: {
          name: attestations[1].subject.dependency.pkg.name,
          range: attestations[1].subject.dependency.pkg.range,
        },
      },
    };
    const matches = matchAttestations(search, attestations);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].issuer, attestations[1].issuer);
  });

  test("matches flaw by GHSA", async (t) => {
    const search = {
      flaw: {
        ghsa: attestations[1].subject.flaw.ghsa,
      },
    };
    const matches = matchAttestations(search, attestations);
    assert.strictEqual(matches.length, 2);
    assert.strictEqual(matches[0].issuer, attestations[1].issuer);
  });
  test("matches flaw by url", async (t) => {
    const search = {
      flaw: {
        url: attestations[1].subject.flaw.url,
      },
    };
    const matches = matchAttestations(search, attestations);
    assert.strictEqual(matches.length, 2);
    assert.strictEqual(matches[0].issuer, attestations[1].issuer);
  });

  test("matches attestation reference", async (t) => {
    const search = {
      attestation: {
        issuer: attestations[2].subject.attestation.issuer,
        issuerSpecificID: attestations[2].subject.attestation.issuerSpecificID,
      },
    };
    const matches = matchAttestations(search, attestations);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].issuer, attestations[2].issuer);
  });

  test("returns empty array for non-matching package", async (t) => {
    const search = {
      pkg: {
        name: "nonexistent",
      },
    };
    const matches = matchAttestations(search, attestations);
    assert.strictEqual(matches.length, 0);
  });

  test("returns empty array for non-matching version range", async (t) => {
    const search = {
      pkg: {
        name: attestations[0].subject.pkg.name,
        range: "1.0.0",
      },
    };
    const matches = matchAttestations(search, attestations);
    assert.strictEqual(matches.length, 0);
  });

  test("returns empty array for unknown subject type", async (t) => {
    const search = {
      unknown: {},
    };
    const matches = matchAttestations(search, attestations);
    assert.strictEqual(matches.length, 0);
  });
});
