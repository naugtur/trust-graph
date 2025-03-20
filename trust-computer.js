const { execSync } = require("child_process");
const { readFileSync, writeFileSync } = require("fs");
const path = require("path");
const stringify = require("json-stable-stringify");

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

function processTrustGraph(packageJsonPath = "package.json") {
  const packageJson = JSON.parse(
    readFileSync(packageJsonPath, { encoding: "utf-8" })
  );

  const result = {};
  const next = [{ dependencies: getValidDeps(packageJson), result, parentTrust: 1 }];
  const maxComputations = 1000;
  let count = 0;

  while (next.length > 0 && count < maxComputations) {
    count++;
    const current = next.shift();
    const nextBatch = computeTrust(current);
    // Avoid processing trust scores that even if they accumulated would still be meaningless
    if (current.parentTrust > 0.1 / maxComputations) {
      next.push(...nextBatch);
    } else {
      process.stdout.write(".");
    }
  }
  return result;
}

function scale(score) {
  return Math.round(12 + 7 * Math.log10(1 + 60 * score));
}
function aggregate(values) {
  const self = values.filter((value) => value === "X").length;
  const paths = values.filter((value) => value !== "X");
  const sum = paths
    .reduce((acc, value) => acc + parseFloat(value), 0)
    .toFixed(3);
  return `" score:${sum}, <br> paths:${paths.length}, <br> X:${self}"`;
}

function main() {
  const result = processTrustGraph(path.join(process.cwd(), "package.json"));

  writeFileSync("computed_trust.json", stringify(result, { space: 2 }));

  const mermaid = ["graph TD"];
  const nodeIds = Object.keys(result);
  const edges = {};
  for (const [node, data] of Object.entries(result)) {
    mermaid.push(
      `  ${nodeIds.indexOf(node)}["**${data.score.toFixed(3)}**<br>${node}"]`
    );

    for (const edge of data.via) {
      const [path, value] = edge.split(":");
      const source = path.split(">").slice(-1)[0];
      if (source) {
        const edgeId = `${nodeIds.indexOf(source)}-${nodeIds.indexOf(node)}`;
        if (!edges[edgeId]) {
          edges[edgeId] = [];
        }
        edges[edgeId].push(
          typeof value === "number" ? parseFloat(value).toFixed(3) : value
        );
      }
    }

    mermaid.push(
      `style ${nodeIds.indexOf(node)} font-size:${scale(data.score)}px;`
    );
  }

  for (const [edge, values] of Object.entries(edges)) {
    const [source, target] = edge.split("-");
    mermaid.push(`  ${source} -->|${aggregate(values)}| ${target}`);
  }

  writeFileSync(
    "computed_trust.md",
    "\n```mermaid\n" + mermaid.join("\n") + "\n```"
  );
}

main();
