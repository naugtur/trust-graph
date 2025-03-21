// @ts-check
const { matchAssertions, getAssertionId } = require("./assertion-matcher");

/**
 * @typedef {Object} CommunityTrust
 * @property {Array<Object>} assertions - List of assertions with their trust scores
 */

/**
 * @typedef {Object} SentimentSummary
 * @property {Array} matches - Matching assertions sorted by trust score
 * @property {number} total - Overall sentiment score
 * @property {number} endorsements - Count of endorsements
 * @property {number} disputes - Count of disputes
 * @property {Array<number>} scores - Array of all trust-weighted scores
 * @property {Object} debug - Debug information for score computation
 */

/**
 * @typedef {Object} AssertionDebug
 * @property {string} id - Unique identifier (issuer + issuerSpecificID)
 * @property {number} score - Score contribution
 * @property {string} type - Assertion type
 * @property {number} trust - Trust score
 * @property {Array<AssertionDebug>} children - Meta-assertions about this assertion
 */

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

/**
 * Collects assertions from trusted nodes in a trust graph
 * @param {Object} trust - Processed trust graph
 * @returns {Promise<CommunityTrust>}
 */
async function getAssertionsFromTrust(trust) {
  const fetchPromises = [];

  // Prepare all fetch operations
  for (const [nodeId, node] of Object.entries(trust)) {
    if (!node.assertions || !node.assertions.url) continue;

    fetchPromises.push(
      fetchJson(node.assertions.url)
        .then(({ assertions }) => {
          // Validate that assertions come from the correct issuer
          const ownAssertions = assertions.filter(
            (assertion) => assertion.issuer === nodeId
          );

          // Sprinkle some trust scores in.
          return ownAssertions.map((assertion) => ({
            ...assertion,
            trust: node.score,
          }));
        })
        .catch((error) => {
          console.warn(
            `Failed to fetch assertions from ${node.assertions.url}:`,
            error
          );
          return []; // Return empty array for failed fetches
        })
    );
  }

  const assertionsArrays = await Promise.all(fetchPromises);
  const assertionsWithTrust = assertionsArrays.flat();

  return {
    assertions: assertionsWithTrust,
  };
}

/**
 * Compute sentiment scores for an assertion with debug info
 * @param {Object} assertion - Assertion to analyze
 * @param {Array} allAssertions - Complete set of assertions
 * @param {Set} visited - Set of already visited assertion IDs to prevent cycles
 */
function computeAssertionScores(assertion, allAssertions, visited = new Set()) {
  const assertionId = getAssertionId(assertion);

  // Prevent infinite recursion by tracking visited assertions
  if (visited.has(assertionId)) {
    return {
      scores: [],
      debug: null,
    };
  }

  // Mark this assertion as visited
  visited.add(assertionId);

  // Base score from the assertion itself
  const direction = assertion.claim.type === "dispute" ? -1 : 1;

  // Create debug object
  const debug = {
    id: assertionId,
    direction,
    children: [],
  };

  // Initial scores array
  const scores = [assertion.trust];

  // Look for meta-assertions (assertions about this assertion)
  const metaMatches = matchAssertions(
    {
      assertion: {
        issuer: assertion.issuer,
        issuerSpecificID: assertion.issuerSpecificID,
      },
    },
    allAssertions
  );
  // if (options.allowBlanketIssuerAssertions) {
  //   const vagueMetaMatches = matchAssertions(
  //     {
  //       assertion: {
  //         issuer: assertion.issuer,
  //         issuerSpecificID: null,
  //       },
  //     },
  //     allAssertions
  //   );
  //   metaMatches.push(...vagueMetaMatches);
  // }

  if (metaMatches.length > 0) {
    // Recursively compute scores for meta-assertions
    metaMatches.forEach((meta) => {
      // Clone the visited set to avoid cross-path contamination - FIX #3
      const newVisited = new Set(visited);

      const metaResult = computeAssertionScores(
        meta,
        allAssertions,
        newVisited
      );

      if (metaResult.debug) {
        debug.children.push(metaResult.debug);
        scores.push(...metaResult.scores);
      }
    });
  }

  const scoresForClaim = scores.flatMap((score) => score * direction);

  debug.scores = scoresForClaim;
  debug.total = scoresForClaim
    .reduce((sum, score) => sum + score, 0)
    .toFixed(3);

  return {
    scores: scoresForClaim,
    debug,
  };
}

/**
 * Find matching assertions for a subject and analyze community sentiment
 * @param {object} subject - Subject to match against
 * @param {Array} assertions - List of assertions with trust scores
 * @returns {SentimentSummary} - Matching assertions and sentiment analysis
 */
function getCommunitySentiment(subject, assertions) {
  const matches = matchAssertions(subject, assertions);

  // Compute scores for all matches including their meta-assertions
  const computationResults = matches.map((match) =>
    computeAssertionScores(match, assertions)
  );

  const allScores = computationResults.flatMap((result) => result.scores);

  // Count endorsements and disputes
  const endorsements = matches.filter((m) => m.claim.type === "endorse").length;
  const disputes = matches.filter((m) => m.claim.type === "dispute").length;

  // Calculate total sentiment
  const total = allScores.reduce((sum, score) => sum + score, 0);

  const debugTree = [
    {
      id: "root",
      total: total.toFixed(3),
      scores: allScores,
      direction: total >= 0 ? 1 : -1,
      children: computationResults.map((result) => result.debug),
    },
  ];

  return {
    matches: matches.sort((a, b) => b.trust - a.trust),
    total,
    endorsements,
    disputes,
    scores: allScores,
    debug: debugTree,
  };
}

module.exports = {
  getAssertionsFromTrust,
  getCommunitySentiment,
};
