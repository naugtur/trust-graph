const { test, suite } = require("node:test");
const assert = require("node:assert");
const { matchAssertions } = require("./assertion-matcher");
const exampleData = require("../schema/example.json");

const assertions = exampleData.assertions;

suite("assertion-matcher", () => {
  test("matches package by name and version range", async (t) => {
    const search = {
      pkg: {
        name: assertions[0].subject.pkg.name,
        range: assertions[0].subject.pkg.range.replace(">=", ""),
      },
    };
    const matches = matchAssertions(search, assertions);
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
    const matches = matchAssertions(search, assertions);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].issuer, assertions[1].issuer);
  });

  test("matches flaw by GHSA", async (t) => {
    const search = {
      flaw: {
        ghsa: assertions[1].subject.flaw.ghsa,
      },
    };
    const matches = matchAssertions(search, assertions);
    assert.strictEqual(matches.length, 2);
    assert.strictEqual(matches[0].issuer, assertions[1].issuer);
  });
  test("matches flaw by url", async (t) => {
    const search = {
      flaw: {
        url: assertions[1].subject.flaw.url,
      },
    };
    const matches = matchAssertions(search, assertions);
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
    const matches = matchAssertions(search, assertions);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].issuer, assertions[2].issuer);
  });

  test("returns empty array for non-matching package", async (t) => {
    const search = {
      pkg: {
        name: "nonexistent",
      },
    };
    const matches = matchAssertions(search, assertions);
    assert.strictEqual(matches.length, 0);
  });

  test("returns empty array for non-matching version range", async (t) => {
    const search = {
      pkg: {
        name: assertions[0].subject.pkg.name,
        range: "1.0.0",
      },
    };
    const matches = matchAssertions(search, assertions);
    assert.strictEqual(matches.length, 0);
  });

  test("returns empty array for obviously irrelevant subject", async (t) => {
    const search = {
      unknown: {},
    };
    const matches = matchAssertions(search, assertions);
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
  const matches = matchAssertions(search, [
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

test("handles nested meta assertions correctly", async (t) => {
  const originalAssertion = {
    subject: {
      pkg: { name: "test-package", range: "^1.0.0" }
    },
    issuer: "issuer-1",
    issuerSpecificID: "assertion-1",
    claim: { type: "endorse" }
  };
  
  const metaAssertion = {
    subject: {
      assertion: {
        issuer: "issuer-1",
        issuerSpecificID: "assertion-1"
      }
    },
    issuer: "issuer-2",
    issuerSpecificID: "meta-1",
    claim: { type: "dispute" }
  };
  
  const assertions = [originalAssertion, metaAssertion];
  
  // First search for the package
  const packageSearch = {
    pkg: { name: "test-package", range: "1.2.0" }
  };
  const packageMatches = matchAssertions(packageSearch, assertions);
  assert.strictEqual(packageMatches.length, 1);
  assert.strictEqual(packageMatches[0].issuerSpecificID, "assertion-1");
  
  // Then search for meta assertions about the found assertion
  const metaSearch = {
    assertion: {
      issuer: packageMatches[0].issuer,
      issuerSpecificID: packageMatches[0].issuerSpecificID
    }
  };
  const metaMatches = matchAssertions(metaSearch, assertions);
  assert.strictEqual(metaMatches.length, 1);
  assert.strictEqual(metaMatches[0].issuerSpecificID, "meta-1");
});


test("handles null as a negative selector", async (t) => {
  const assertions = [{
    subject: {
      pkg: { name: "test-package", range: "^1.0.0" }
    },
    issuer: "issuer-1",
    issuerSpecificID: "assertion-1",
    claim: { type: "endorse" }
  }, {
    subject: {
      assertion: {
        issuer: "issuer-1",
        issuerSpecificID: "assertion-1"
      }
    },
    issuer: "issuer-2",
    issuerSpecificID: "meta-1",
    claim: { type: "dispute" }
  },{
    subject: {
      assertion: {
        issuer: "issuer-1",
      }
    },
    issuer: "issuer-2",
    issuerSpecificID: "meta-2",
    claim: { type: "dispute" }
  }];
  
  const negativeSearch = {
    assertion: {
      issuer: "issuer-1",
      issuerSpecificID: null
    }
  };
  const packageMatches = matchAssertions(negativeSearch, assertions);
  assert.strictEqual(packageMatches.length, 1);
  assert.strictEqual(packageMatches[0].issuerSpecificID, "meta-2");
  
});


