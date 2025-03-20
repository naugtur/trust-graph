const { test, suite } = require("node:test");
const assert = require("node:assert");
const matchassertions = require("./assertion-matcher");
const exampleData = require("./schema/example.json");

const assertions = exampleData.assertions;

suite("assertion-matcher", () => {
  test("matches package by name and version range", async (t) => {
    const search = {
      pkg: {
        name: assertions[0].subject.pkg.name,
        range: assertions[0].subject.pkg.range.replace(">=", ""),
      },
    };
    const matches = matchassertions(search, assertions);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].issuer, assertions[0].issuer);
  });

  test("matches dependency assertion", async (t) => {
    const search = {
      dependency: {
        dependent: { name: assertions[1].subject.dependency.dependent.name },
        pkg: {
          name: assertions[1].subject.dependency.pkg.name,
          range: assertions[1].subject.dependency.pkg.range,
        },
      },
    };
    const matches = matchassertions(search, assertions);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].issuer, assertions[1].issuer);
  });

  test("matches flaw by GHSA", async (t) => {
    const search = {
      flaw: {
        ghsa: assertions[1].subject.flaw.ghsa,
      },
    };
    const matches = matchassertions(search, assertions);
    assert.strictEqual(matches.length, 2);
    assert.strictEqual(matches[0].issuer, assertions[1].issuer);
  });
  test("matches flaw by url", async (t) => {
    const search = {
      flaw: {
        url: assertions[1].subject.flaw.url,
      },
    };
    const matches = matchassertions(search, assertions);
    assert.strictEqual(matches.length, 2);
    assert.strictEqual(matches[0].issuer, assertions[1].issuer);
  });

  test("matches assertion reference", async (t) => {
    const search = {
      assertion: {
        issuer: assertions[2].subject.assertion.issuer,
        issuerSpecificID: assertions[2].subject.assertion.issuerSpecificID,
      },
    };
    const matches = matchassertions(search, assertions);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].issuer, assertions[2].issuer);
  });

  test("returns empty array for non-matching package", async (t) => {
    const search = {
      pkg: {
        name: "nonexistent",
      },
    };
    const matches = matchassertions(search, assertions);
    assert.strictEqual(matches.length, 0);
  });

  test("returns empty array for non-matching version range", async (t) => {
    const search = {
      pkg: {
        name: assertions[0].subject.pkg.name,
        range: "1.0.0",
      },
    };
    const matches = matchassertions(search, assertions);
    assert.strictEqual(matches.length, 0);
  });

  test("returns empty array for obviously irrelevant subject", async (t) => {
    const search = {
      unknown: {},
    };
    const matches = matchassertions(search, assertions);
    assert.strictEqual(matches.length, 0);
  });
});

test("assertion-matcher is future-proof", async (t) => {
  const search = {
    grumbleflopbouncemachine: {
      widget: {
        name: "a",
        range: "^1.0.0",
      },
    },
  };
  const matches = matchassertions(search, [
    {
      subject: {
        pkg: {
          name: "a",
          range: "^1.0.0",
        },
      },
      issuer: "b",
      issuerSpecificID: "1",
      claim: {
        type: "endorse",
      },
    },
    {
      subject: {
        grumbleflopbouncemachine: {
          widget: {
            name: "a",
            range: "1.1.1",
          },
        },
      },
      issuer: "c",
      issuerSpecificID: "2",
      claim: {
        type: "endorse",
      },
    },
  ]);
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].issuerSpecificID, "2");
});
