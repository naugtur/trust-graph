const path = require("path");

const { processTrustGraph } = require("./src/trust-computer");
const {
  visualizeTrustGraph,
  generateDebugVisualization,
} = require("./src/visualize-trust");
const {
  getAssertionsFromTrust,
  getCommunitySentiment,
} = require("./src/community");

async function whatDoesMyCommunityThink(subject) {

  const packageJsonPath = path.join(process.cwd(), "package.json");

  // Process trust graph
  const { trust, stats } = processTrustGraph(packageJsonPath);

  console.log(
    `Processed ${stats.count} paths, skipped going further down ${stats.skip} more because their trust score was below threshold.`
  );

  // Generate visualization
  visualizeTrustGraph(trust, "computed_trust");

  // Get community sentiment for subject
  try {
    // Get assertions from community using the trust graph directly
    const communityData = await getAssertionsFromTrust(trust);
    console.log(
      `\nFound ${communityData.assertions.length} assertions from the community`
    );

    if (communityData.assertions.length === 0) {
      console.log("\nNo assertions found. Cannot perform sentiment analysis.");
      return;
    }

    // Get sentiment for subject
    const sentiment = getCommunitySentiment(subject, communityData.assertions);

    // Generate visualization with proper arguments
    if (sentiment.debug && sentiment.debug.length > 0) {
      generateDebugVisualization(
        sentiment.debug,
        "computed_sentiment",
        communityData.assertions
      );
    }

    // Print basic sentiment results
    console.log("\nSentiment analysis results:");
    console.log(`Total score: ${sentiment.total.toFixed(3)}`);
    console.log(`Matching assertions: ${sentiment.matches.length}`);
    console.log(`Endorsements: ${sentiment.endorsements}`);
    console.log(`Disputes: ${sentiment.disputes}`);
  } catch (error) {
    console.error(`Error fetching community data: ${error.message}`);
    console.error(error.stack);
  }
}

console.log(`Analyzing community sentiment for a flaw in semver@5.7.1`);

whatDoesMyCommunityThink({
  pkg: {
    name: "semver",
    range: "5.7.1",
  },
  flaw: [{ ghsa: "GHSA-c2qf-rxjj-qqgw" }, { cwe: "CWE-1333" }],
});
