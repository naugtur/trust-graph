/**
 * @typedef {Object.<string, TrustNode>} Trust
 *
 * @typedef {Object} TrustNode
 * @property {number} score - The accumulated trust score for this node
 * @property {Object} assertions - The assertions from the package.json file
 * @property {string[]} via - Array of strings showing the trust paths and scores
 * @property {string[]} dependencies - Array of trusted dependencies
 */

const { readFileSync } = require("fs");
const path = require("path");

function getPackageJson(packageName) {
  try {
    const packagePath = require.resolve(packageName + "/package.json", {
      paths: [path.join(process.cwd(), "node_modules")],
    });
    return JSON.parse(readFileSync(packagePath));
  } catch (error) {
    console.error(
      `Error reading package.json for ${packageName}:`,
      error.message
    );
    return {};
  }
}

function getValidDeps(packageJson) {
  return Object.keys(packageJson.dependencies || {}).filter((dep) =>
    dep.endsWith("/i_trust")
  );
}

function computeTrust({
  dependencies = [],
  parentTrust,
  result,
  currentPath = [],
} = {}) {
  const trustPerDep = parentTrust / dependencies.length;

  const next = [];

  for (const dep of dependencies) {
    if (!result[dep]) {
      result[dep] = {
        score: 0,
        assertions: null,
        via: [],
      };
      const packageJson = getPackageJson(dep);
      result[dep].assertions = packageJson.assertions;
      result[dep].dependencies = getValidDeps(packageJson);
    }

    const pathToThis = [...currentPath, dep];

    // Avoid acumulating trust from circular dependencies
    if (!currentPath.includes(dep)) {
      result[dep].score += trustPerDep;
      result[dep].via.push(currentPath.join(">") + ":" + trustPerDep);

      if (result[dep].dependencies.length > 0) {
        next.push({
          dependencies: result[dep].dependencies,
          currentPath: pathToThis,
          parentTrust: trustPerDep,
          result,
        });
      }
    } else {
      result[dep].via.push(currentPath.join(">") + ":X");
    }
  }

  return next;
}

/**
 *
 * @param {string} packageJsonPath - Path to the package.json file to process
 * @returns { trust: Trust, stats: { count: number, skip: number } }
 */
function processTrustGraph(packageJsonPath = "package.json") {
  const packageJson = JSON.parse(
    readFileSync(packageJsonPath, { encoding: "utf-8" })
  );

  const result = {};
  const next = [
    { dependencies: getValidDeps(packageJson), result, parentTrust: 1 },
  ];
  const minMeaningfulTrust = 0.01;
  let count = 0;
  let skip = 0;

  while (next.length > 0) {
    count++;
    const current = next.shift();
    const nextBatch = computeTrust(current);
    // Avoid processing trust scores that even if they accumulated, wouldn't make a difference.
    // This is the most proportional and fair way to limit the depth of the trust computation in a graph where cycles are expected to be common and the number of trusted peers in each node may vary greatly.
    if (current.parentTrust > minMeaningfulTrust / 100) {
      next.push(...nextBatch);
    } else {
      skip++;
    }
  }
  return {
    trust: result,
    stats: {
      count,
      skip,
    },
  };
}

module.exports = {
  processTrustGraph,
  computeTrust,
};
